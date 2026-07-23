'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, CircleDashed, Loader2 } from 'lucide-react';
import { formatRelativeTime, formatDateInTimezone } from '@/lib/utils/date';
import { JobHistoryEntry, JobProgressSnapshot } from '@/lib/types/job-progress';

const POLL_INTERVAL_MS = 4000;

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return '—';
  const seconds = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function JobDetailRows({ jobId }: { jobId: string }) {
  const [snapshot, setSnapshot] = useState<JobProgressSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/cron/measurements/${jobId}`);
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        setSnapshot(data?.progress ?? null);
        // Keep refreshing this job's item list live while it's still running,
        // instead of freezing on whatever it looked like at first click.
        if (data?.progress?.status === 'running') {
          pollTimer.current = setTimeout(load, POLL_INTERVAL_MS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [jobId]);

  if (loading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Đang tải chi tiết...</div>;
  }

  if (!snapshot) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Không có chi tiết cho job này.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {snapshot.items.map((item, i) => (
        <div key={`${item.productId}-${item.deviceType}-${i}`} className="flex items-center gap-2.5 px-4 py-2 text-[12.5px]">
          {item.status === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-sev-good-foreground" />}
          {item.status === 'failed' && <X className="h-3.5 w-3.5 shrink-0 text-sev-poor-foreground" />}
          {item.status === 'running' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand" />}
          {item.status === 'pending' && <CircleDashed className="h-3.5 w-3.5 shrink-0 text-faint" />}
          <span className="flex-1 truncate text-foreground">{item.product}</span>
          <span className="shrink-0 text-faint">{item.deviceType === 'DESKTOP' ? 'Desktop' : 'Mobile'}</span>
          {item.status === 'done' && item.score != null && (
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{item.score}</span>
          )}
          {item.status === 'failed' && <span className="shrink-0 text-sev-poor-foreground">Lỗi</span>}
        </div>
      ))}
    </div>
  );
}

export function JobHistory() {
  const [jobs, setJobs] = useState<JobHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/cron/measurements/history');
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || 'Failed to load job history');

        setJobs(data.jobs);
        setError(null);

        // Open the in-progress run automatically the first time we see one,
        // so watching "Test Run" work doesn't require hunting for it and
        // clicking — but don't fight the user if they've since collapsed it.
        const running = (data.jobs as JobHistoryEntry[]).find((j) => j.status === 'running');
        if (running && !autoExpandedRef.current) {
          setExpandedJobId(running.jobId);
          autoExpandedRef.current = true;
        }

        // Keep polling only while something is actually in progress.
        if ((data.jobs as JobHistoryEntry[]).some((j) => j.status === 'running')) {
          pollTimer.current = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load job history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  if (loading) {
    return <div className="h-[180px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />;
  }

  if (error) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-sm text-sev-poor-foreground">
        Lỗi tải lịch sử job: {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Chưa có job nào chạy.
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 text-sm font-semibold text-foreground border-b border-border">Lịch sử job</div>
      <div className="divide-y divide-border">
        {jobs.map((job) => {
          const isExpanded = expandedJobId === job.jobId;
          const isRunning = job.status === 'running';
          return (
            <div key={job.jobId}>
              <button
                onClick={() => setExpandedJobId(isExpanded ? null : job.jobId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 text-[13px] font-semibold text-foreground">
                    <span className="tabular-nums">{formatDateInTimezone(job.startedAt, 'dd/MM/yyyy HH:mm')}</span>
                    <span className="text-[11px] font-normal text-faint">({formatRelativeTime(job.startedAt)})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-faint">
                    {isRunning && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand" />}
                    {isRunning
                      ? 'Đang chạy'
                      : `Xong lúc ${formatDateInTimezone(job.finishedAt ?? job.startedAt, 'HH:mm')} · mất ${formatDuration(job.startedAt, job.finishedAt)}`}
                  </div>
                </div>
                <div className="shrink-0 text-xs tabular-nums text-foreground font-semibold">
                  {job.completedItems}/{job.totalItems}
                </div>
                {job.failedItems > 0 && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-sev-poor text-sev-poor-foreground">
                    {job.failedItems} lỗi
                  </span>
                )}
              </button>
              {isExpanded && <JobDetailRows jobId={job.jobId} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
