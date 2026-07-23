import { PageSpeedService } from '@/lib/services/pagespeed';
import { DeviceType } from '@prisma/client';
import { JobHistoryEntry, JobProgressItem, JobProgressSnapshot } from '@/lib/types/job-progress';

const JOB_HISTORY_KEY = 'job_history';
const JOB_HISTORY_LIMIT = 30;
const CURRENT_JOB_KEY = 'current_job_id';

// If a "running" job hasn't written a progress update in this long, the
// process running it is gone (killed, crashed, redeployed) and nothing will
// ever finish it — treat it as abandoned instead of showing it forever.
const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

function jobProgressKey(jobId: string): string {
  return `job_progress:${jobId}`;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function saveProgress(databaseService: any, snapshot: JobProgressSnapshot): Promise<void> {
  snapshot.updatedAt = new Date().toISOString();
  await databaseService.setConfig(jobProgressKey(snapshot.jobId), JSON.stringify(snapshot));
}

async function appendJobHistory(databaseService: any, entry: JobHistoryEntry): Promise<void> {
  const raw = await databaseService.getConfig(JOB_HISTORY_KEY);
  const list: JobHistoryEntry[] = raw ? JSON.parse(raw) : [];
  list.unshift(entry);
  await databaseService.setConfig(JOB_HISTORY_KEY, JSON.stringify(list.slice(0, JOB_HISTORY_LIMIT)));
}

async function updateJobHistory(databaseService: any, jobId: string, patch: Partial<JobHistoryEntry>): Promise<void> {
  const raw = await databaseService.getConfig(JOB_HISTORY_KEY);
  if (!raw) return;
  const list: JobHistoryEntry[] = JSON.parse(raw);
  const idx = list.findIndex((e) => e.jobId === jobId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  await databaseService.setConfig(JOB_HISTORY_KEY, JSON.stringify(list));
}

// Reads a job's progress, self-healing it if it looks abandoned — a
// "running" snapshot that hasn't been touched in STALE_JOB_THRESHOLD_MS
// means the process driving it is gone (killed, crashed, redeployed) and
// nothing will ever move it forward, so treat it as finished rather than
// showing a live-looking job (and a nonsense ETA) forever.
export async function getJobProgress(databaseService: any, jobId: string): Promise<JobProgressSnapshot | null> {
  const raw = await databaseService.getConfig(jobProgressKey(jobId));
  if (!raw) return null;

  const snapshot: JobProgressSnapshot = JSON.parse(raw);

  // Snapshots written before updatedAt existed have none — fall back to
  // startedAt so old abandoned jobs still get healed instead of silently
  // comparing against `undefined` (NaN never satisfies the ">" check below).
  const lastActivity = new Date(snapshot.updatedAt ?? snapshot.startedAt).getTime();
  const isStale =
    snapshot.status === 'running' &&
    (Number.isNaN(lastActivity) || Date.now() - lastActivity > STALE_JOB_THRESHOLD_MS);

  if (isStale) {
    snapshot.status = 'completed';
    snapshot.finishedAt = snapshot.updatedAt ?? new Date().toISOString();
    await saveProgress(databaseService, snapshot);
    await updateJobHistory(databaseService, jobId, {
      status: 'completed',
      finishedAt: snapshot.finishedAt,
      completedItems: snapshot.completedItems,
      failedItems: snapshot.failedItems,
    });

    const activeJobId = await databaseService.getConfig('active_job_id');
    if (activeJobId === jobId) {
      await databaseService.setConfig('active_job_id', '');
    }
    const currentJobId = await databaseService.getConfig(CURRENT_JOB_KEY);
    if (currentJobId === jobId) {
      await databaseService.setConfig(CURRENT_JOB_KEY, '');
    }
  }

  return snapshot;
}

export async function getJobHistory(databaseService: any): Promise<JobHistoryEntry[]> {
  const raw = await databaseService.getConfig(JOB_HISTORY_KEY);
  let list: JobHistoryEntry[] = raw ? JSON.parse(raw) : [];

  // getJobProgress() only heals a job the moment something reads its
  // specific progress record — a history entry nobody has looked at since
  // (or one whose background process died before ever writing a progress
  // record at all, e.g. killed right after the triggering response was
  // sent) stays "running" forever otherwise.
  const runningEntries = list.filter((e) => e.status === 'running');
  if (runningEntries.length > 0) {
    await Promise.all(runningEntries.map((e) => getJobProgress(databaseService, e.jobId)));

    const refreshed = await databaseService.getConfig(JOB_HISTORY_KEY);
    list = refreshed ? JSON.parse(refreshed) : list;

    const stillRunning = list.filter((e) => e.status === 'running');
    if (stillRunning.length > 0) {
      const now = new Date().toISOString();
      list = list.map((e) =>
        e.status === 'running' ? { ...e, status: 'completed' as const, finishedAt: e.finishedAt ?? now } : e
      );
      await databaseService.setConfig(JOB_HISTORY_KEY, JSON.stringify(list));
    }
  }

  return list;
}

async function finishJob(databaseService: any, snapshot: JobProgressSnapshot) {
  snapshot.status = 'completed';
  snapshot.finishedAt = new Date().toISOString();
  await saveProgress(databaseService, snapshot);
  await updateJobHistory(databaseService, snapshot.jobId, {
    status: 'completed',
    finishedAt: snapshot.finishedAt,
    completedItems: snapshot.completedItems,
    failedItems: snapshot.failedItems,
  });
  await databaseService.setConfig(CURRENT_JOB_KEY, '');
  await databaseService.setConfig('active_job_id', '');

  const duration = new Date(snapshot.finishedAt).getTime() - new Date(snapshot.startedAt).getTime();
  await databaseService.setConfig('last_cron_run', new Date().toISOString()).catch(() => {});
  await databaseService.setConfig('last_cron_results', JSON.stringify({
    totalProducts: Math.round(snapshot.totalItems / 2),
    successCount: snapshot.completedItems,
    failureCount: snapshot.failedItems,
    duration,
    timestamp: new Date().toISOString(),
    jobId: snapshot.jobId,
  })).catch(() => {});

  console.log(`🎉 [Job ${snapshot.jobId}] Completed — ${snapshot.completedItems}/${snapshot.totalItems} ok, ${snapshot.failedItems} failed`);

  return {
    success: true,
    jobId: snapshot.jobId,
    status: 'completed' as const,
    totalProducts: Math.round(snapshot.totalItems / 2),
    completedItems: snapshot.completedItems,
    failedItems: snapshot.failedItems,
    totalItems: snapshot.totalItems,
  };
}

// Processes exactly one product's worth of measurements (both devices, if
// both are still pending) and returns. Each invocation is short enough
// (~1-2 PageSpeed calls) to always finish well inside a route's
// maxDuration — unlike the old design, nothing here waits on a 60-second
// inter-batch sleep or tries to run for the job's full ~20-minute span in
// one background task, which Vercel doesn't reliably let survive past the
// triggering response anyway.
async function processNextChunk(databaseService: any, snapshot: JobProgressSnapshot) {
  const pendingItems = snapshot.items.filter((it) => it.status === 'pending');

  if (pendingItems.length === 0) {
    return finishJob(databaseService, snapshot);
  }

  const nextProductId = pendingItems[0].productId;
  const chunk = pendingItems.filter((it) => it.productId === nextProductId);
  const product = await databaseService.getProductById(nextProductId);

  if (!product) {
    // Product was deleted/deactivated after the job started — skip it.
    for (const item of chunk) {
      item.status = 'failed';
      item.error = 'Product no longer exists';
      snapshot.failedItems++;
    }
    await saveProgress(databaseService, snapshot);
    return {
      success: true,
      jobId: snapshot.jobId,
      status: 'running' as const,
      completedItems: snapshot.completedItems,
      failedItems: snapshot.failedItems,
      totalItems: snapshot.totalItems,
    };
  }

  const pageSpeedService = new PageSpeedService();
  let isFirstInChunk = true;

  for (const item of chunk) {
    item.status = 'running';
    await saveProgress(databaseService, snapshot);

    try {
      if (!isFirstInChunk) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // respect PageSpeed rate limits
      }
      isFirstInChunk = false;

      const measurement = await pageSpeedService.measurePerformance(product.url, item.deviceType);

      await databaseService.createMeasurement({
        productId: item.productId,
        deviceType: item.deviceType,
        performanceScore: measurement.performanceScore,
        fcp: measurement.fcp,
        lcp: measurement.lcp,
        cls: measurement.cls,
        fid: measurement.fid,
        ttfb: measurement.ttfb,
        speedIndex: measurement.speedIndex,
        tbt: measurement.tbt,
        opportunity: null,
        diagnostics: null,
        measurementDate: new Date(),
      });

      item.status = 'done';
      item.score = measurement.performanceScore;
      snapshot.completedItems++;
      console.log(`✅ [Job ${snapshot.jobId}] ${item.product} (${item.deviceType}): ${measurement.performanceScore}`);
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      snapshot.failedItems++;
      console.error(`❌ [Job ${snapshot.jobId}] ${item.product} (${item.deviceType}) failed:`, error);
    }

    await saveProgress(databaseService, snapshot);
  }

  const stillPending = snapshot.items.some((it) => it.status === 'pending');
  if (!stillPending) {
    return finishJob(databaseService, snapshot);
  }

  return {
    success: true,
    jobId: snapshot.jobId,
    status: 'running' as const,
    totalProducts: Math.round(snapshot.totalItems / 2),
    completedItems: snapshot.completedItems,
    failedItems: snapshot.failedItems,
    totalItems: snapshot.totalItems,
  };
}

async function startNewJob(databaseService: any) {
  const products = await databaseService.getActiveProducts();

  if (products.length === 0) {
    return {
      success: true,
      message: 'No active products to measure',
      jobId: null,
      totalProducts: 0,
    };
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const deviceTypes = ['DESKTOP', 'MOBILE'] as DeviceType[];
  const items: JobProgressItem[] = products.flatMap((product: any) =>
    deviceTypes.map((deviceType) => ({
      productId: product.id,
      product: product.name,
      deviceType,
      status: 'pending' as const,
    }))
  );

  const snapshot: JobProgressSnapshot = {
    jobId,
    status: 'running',
    totalItems: items.length,
    completedItems: 0,
    failedItems: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items,
  };

  await appendJobHistory(databaseService, {
    jobId,
    status: 'running',
    totalItems: items.length,
    completedItems: 0,
    failedItems: 0,
    startedAt: snapshot.startedAt,
  });
  await databaseService.setConfig(CURRENT_JOB_KEY, jobId);
  await databaseService.setConfig('active_job_id', jobId); // read by /api/cron/measurements/active
  await saveProgress(databaseService, snapshot);

  console.log(`🚀 [Job ${jobId}] Started — ${products.length} products, ${items.length} measurements`);

  return processNextChunk(databaseService, snapshot);
}

// Advances measurement work by exactly one chunk per call — starts a new
// job if none is in progress (subject to the once-a-day guard below), or
// continues whichever job is already running. Meant to be called
// repeatedly (by the external cron every couple of minutes, and by the
// dashboard's own polling while a job is in view) rather than once and
// left to run unattended in the background.
export async function runMeasurementCycle(databaseService: any, options: { forceNewRun?: boolean } = {}) {
  const currentJobId = await databaseService.getConfig(CURRENT_JOB_KEY);

  if (currentJobId) {
    const snapshot = await getJobProgress(databaseService, currentJobId);
    if (snapshot && snapshot.status === 'running') {
      return processNextChunk(databaseService, snapshot);
    }
    // Snapshot missing, or getJobProgress just healed it as abandoned —
    // either way it's not usable as "the job in progress" anymore.
    await databaseService.setConfig(CURRENT_JOB_KEY, '');
  }

  if (!options.forceNewRun) {
    // The external cron fires many times a day to advance an in-progress
    // job — it should only ever kick off one fresh full run per day, not
    // start over every time it happens to find nothing in progress.
    const history = await getJobHistory(databaseService);
    const startedToday = history.find((e) => e.startedAt.startsWith(todayDateString()));
    if (startedToday) {
      return {
        success: true,
        message: 'Already ran today',
        jobId: startedToday.jobId,
        status: startedToday.status,
      };
    }
  }

  return startNewJob(databaseService);
}
