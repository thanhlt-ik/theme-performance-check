import { PageSpeedService } from '@/lib/services/pagespeed';
import { DeviceType } from '@prisma/client';
import { JobHistoryEntry, JobProgressItem, JobProgressSnapshot } from '@/lib/types/job-progress';

const JOB_HISTORY_KEY = 'job_history';
const JOB_HISTORY_LIMIT = 30;

// If a "running" job hasn't written a progress update in this long, the
// process running it is gone (killed, crashed, redeployed) and nothing will
// ever finish it — treat it as abandoned instead of showing it forever.
const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

function jobProgressKey(jobId: string): string {
  return `job_progress:${jobId}`;
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
  }

  return snapshot;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

// Runs the full batch measurement job in the background: measures every
// active product on both devices, persisting live progress to SystemConfig
// so the dashboard's job progress panel and job history can poll it.
async function processMeasurements(products: any[], databaseService: any, jobId: string) {
  let snapshot: JobProgressSnapshot | null = null;
  try {
    console.log(`🕐 [Job ${jobId}] Processing measurements in background...`);
    const startTime = Date.now();

    const pageSpeedService = new PageSpeedService();
    const results = [];
    const deviceTypes = ['DESKTOP', 'MOBILE'] as DeviceType[];

    const progressItems: JobProgressItem[] = products.flatMap((product) =>
      deviceTypes.map((deviceType) => ({
        productId: product.id,
        product: product.name,
        deviceType,
        status: 'pending' as const,
      }))
    );
    snapshot = {
      jobId,
      status: 'running',
      totalItems: progressItems.length,
      completedItems: 0,
      failedItems: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: progressItems,
    };
    await databaseService.setConfig('active_job_id', jobId);
    await saveProgress(databaseService, snapshot!);

    const findItem = (productId: string, deviceType: DeviceType) =>
      snapshot!.items.find((it) => it.productId === productId && it.deviceType === deviceType)!;

    const BATCH_SIZE = 3; // Each batch processes maximum 3 products
    const productBatches = chunkArray(products, BATCH_SIZE);
    const totalBatches = productBatches.length;

    console.log(`📦 [Job ${jobId}] Processing ${products.length} products in ${totalBatches} batches of ${BATCH_SIZE}`);

    let batchIndex = 0;
    for (const batch of productBatches) {
      batchIndex++;
      console.log(`📋 [Job ${jobId}] Starting batch ${batchIndex}/${totalBatches} with ${batch.length} products`);

      if (batchIndex > 1) {
        const batchDelayMs = 60000; // 60 seconds rest between batches
        console.log(`⏱️ [Job ${jobId}] Waiting ${batchDelayMs / 1000}s between batches...`);
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }

      for (const product of batch) {
        console.log(`🔍 [Job ${jobId}] Measuring ${product.name}... (batch ${batchIndex}/${totalBatches})`);

        for (const deviceType of deviceTypes) {
          const progressItem = findItem(product.id, deviceType);
          progressItem.status = 'running';
          await saveProgress(databaseService, snapshot!);

          try {
            if (results.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }

            const measurement = await pageSpeedService.measurePerformance(
              product.url,
              deviceType
            );

            const savedMeasurement = await databaseService.createMeasurement({
              productId: product.id,
              deviceType,
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
              measurementDate: new Date()
            });

            results.push({
              product: product.name,
              deviceType,
              score: measurement.performanceScore,
              success: true,
              measurementId: savedMeasurement.id
            });

            progressItem.status = 'done';
            progressItem.score = measurement.performanceScore;
            snapshot!.completedItems++;
            await saveProgress(databaseService, snapshot!);

            console.log(`✅ [Job ${jobId}] ${product.name} (${deviceType}): Score ${measurement.performanceScore}`);

          } catch (error) {
            console.error(`❌ [Job ${jobId}] Failed to measure ${product.name} (${deviceType}):`, error);
            results.push({
              product: product.name,
              deviceType,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            progressItem.status = 'failed';
            progressItem.error = error instanceof Error ? error.message : 'Unknown error';
            snapshot!.failedItems++;
            await saveProgress(databaseService, snapshot!);
          }
        }
      }
    }

    snapshot!.status = 'completed';
    snapshot!.finishedAt = new Date().toISOString();
    await saveProgress(databaseService, snapshot!);
    await databaseService.setConfig('active_job_id', '');
    await updateJobHistory(databaseService, jobId, {
      status: 'completed',
      finishedAt: snapshot!.finishedAt,
      totalItems: snapshot!.totalItems,
      completedItems: snapshot!.completedItems,
      failedItems: snapshot!.failedItems,
    });

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`🎉 [Job ${jobId}] Cron job completed in ${Math.round(duration / 1000)}s`);
    console.log(`📈 [Job ${jobId}] Success: ${successCount}, Failed: ${failureCount}`);

    try {
      await databaseService.setConfig('last_cron_run', new Date().toISOString());
      await databaseService.setConfig('last_cron_results', JSON.stringify({
        totalProducts: products.length,
        successCount,
        failureCount,
        duration,
        timestamp: new Date().toISOString(),
        jobId
      }));
    } catch (configError) {
      console.warn(`[Job ${jobId}] Failed to save cron run summary:`, configError);
    }

    return {
      success: true,
      jobId,
      results,
      summary: {
        totalProducts: products.length,
        totalMeasurements: results.length,
        successCount,
        failureCount,
        duration: `${Math.round(duration / 1000)}s`
      }
    };
  } catch (error) {
    console.error(`❌ [Job ${jobId}] Background processing failed:`, error);

    if (snapshot) {
      snapshot.status = 'completed';
      snapshot.finishedAt = new Date().toISOString();
      await saveProgress(databaseService, snapshot).catch(() => {});
      await updateJobHistory(databaseService, jobId, {
        status: 'completed',
        finishedAt: snapshot.finishedAt,
        completedItems: snapshot.completedItems,
        failedItems: snapshot.failedItems,
      }).catch(() => {});
    }
    await databaseService.setConfig('active_job_id', '').catch(() => {});

    return {
      success: false,
      jobId,
      error: error instanceof Error ? error.message : 'Unknown background processing error'
    };
  }
}

// Kicks off a batch measurement job for every active product and returns
// immediately — the job itself finishes in the background. Shared by the
// external cron webhook and the dashboard's own "Test Run" trigger so both
// entry points behave identically.
export async function triggerMeasurementJob(databaseService: any) {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const products = await databaseService.getActiveProducts();

  console.log(`📊 Found ${products.length} active products to measure`);

  if (products.length === 0) {
    return {
      success: true,
      message: 'No active products to measure',
      results: [],
      jobId: null,
      totalProducts: 0,
    };
  }

  await appendJobHistory(databaseService, {
    jobId,
    status: 'running',
    totalItems: products.length * 2,
    completedItems: 0,
    failedItems: 0,
    startedAt: new Date().toISOString(),
  });

  console.log(`🚀 [Job ${jobId}] Starting background processing for ${products.length} products`);

  processMeasurements(products, databaseService, jobId).catch((error) => {
    console.error(`❌ [Job ${jobId}] Unhandled background error:`, error);
  });

  return {
    success: true,
    message: `Started processing ${products.length} products in background`,
    jobId,
    status: 'PROCESSING',
    startedAt: new Date().toISOString(),
    totalProducts: products.length,
  };
}

export async function getJobHistory(databaseService: any): Promise<JobHistoryEntry[]> {
  const raw = await databaseService.getConfig(JOB_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
