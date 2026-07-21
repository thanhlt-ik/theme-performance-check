'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Loader2, Play, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date';
import { useJobProgress } from '@/lib/hooks/use-job-progress';

interface CronStatus {
  lastRun: string | null;
  lastResults: {
    totalProducts: number;
    successCount: number;
    failureCount: number;
    // The API stores this as raw milliseconds in some code paths and a
    // pre-formatted string ("Xs") in others — handle both defensively.
    duration: string | number;
    timestamp: string;
  } | null;
  status: string;
}

function formatDuration(duration: string | number): string {
  if (typeof duration === 'string') return duration;
  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function CronManagement() {
  const { startJob } = useJobProgress();
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCronStatus();
  }, []);

  const fetchCronStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cron/measurements');

      const data = await response.json();

      if (response.ok && data.success) {
        setCronStatus(data);
        setError(null);
      } else {
        throw new Error(data.error || `Failed to fetch cron status (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching cron status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cron status');
    } finally {
      setLoading(false);
    }
  };

  const runManualTest = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/dashboard/trigger-measurement', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchCronStatus();
        if (result.jobId) startJob(result.jobId);
        setSuccessMessage(
          `Đã bắt đầu đo cho ${result.totalProducts || 0} sản phẩm — xem tiến trình ở góc dưới màn hình.`
        );
      } else {
        throw new Error(result.error || `Failed to run cron job (${response.status})`);
      }
    } catch (err) {
      console.error('Error running manual test:', err);
      setError(err instanceof Error ? err.message : 'Failed to run cron job');
    } finally {
      setIsRunning(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/cron/measurements` : '/api/cron/measurements';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-[900px]">
        <div className="h-[130px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />
        <div className="h-[220px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />
      </div>
    );
  }

  const lastResults = cronStatus?.lastResults;

  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sev-good-foreground" />
            <span className="text-sm font-semibold text-foreground">Cron job đang hoạt động bình thường</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCronStatus} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={runManualTest} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang chạy...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Run
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-sev-poor bg-sev-poor/10 px-3 py-2 text-sm text-foreground">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-md bg-sev-good px-3 py-2 text-sm text-sev-good-foreground">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div>
            <div className="text-[11px] text-muted-foreground">Lần chạy gần nhất</div>
            <div className="text-[15px] font-bold text-foreground mt-1">
              {cronStatus?.lastRun ? formatRelativeTime(cronStatus.lastRun) : 'Chưa từng chạy'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Thời gian chạy</div>
            <div className="text-[15px] font-bold text-foreground mt-1 tabular-nums">
              {lastResults ? formatDuration(lastResults.duration) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Kết quả</div>
            <div className="text-[15px] font-bold text-sev-good-foreground mt-1">
              {lastResults ? `${lastResults.successCount}/${lastResults.successCount + lastResults.failureCount} thành công` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="text-sm font-semibold text-foreground mb-2">Thiết lập webhook cron ngoài</div>
        <div className="text-[13px] text-muted-foreground mb-3">
          Gọi endpoint sau mỗi ngày từ dịch vụ cron ngoài (ví dụ cron-job.org) nếu không dùng Vercel Cron.
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2.5 font-mono text-xs overflow-x-auto">
          <span className="flex-1 whitespace-nowrap">POST {webhookUrl}</span>
          <button onClick={copyWebhookUrl} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Copy webhook URL">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 rounded-md border border-border bg-muted px-3 py-2.5 font-mono text-xs">
          Header: Authorization: Bearer •••••••••
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              cron-job.org
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
