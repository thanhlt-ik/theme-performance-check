'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CircleDashed, Loader2, X, Check } from 'lucide-react';
import { useJobProgress } from '@/lib/hooks/use-job-progress';

// Defensive cap: the server now auto-heals a job that's stopped reporting
// progress (see getJobProgress's staleness check), but if an ETA ever comes
// out absurd anyway, show nothing rather than a nonsense multi-hour countdown.
const MAX_SANE_ETA_SECONDS = 3 * 60 * 60;

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0 || seconds > MAX_SANE_ETA_SECONDS) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

export function JobProgressPanel() {
  const { snapshot } = useJobProgress();
  const [expanded, setExpanded] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // Auto-collapse the "completed" summary a few seconds after it lands.
  useEffect(() => {
    if (snapshot?.status === 'completed') {
      const t = setTimeout(() => setDismissedAt(Date.now()), 6000);
      return () => clearTimeout(t);
    }
    setDismissedAt(null);
  }, [snapshot?.status, snapshot?.finishedAt]);

  if (!snapshot) return null;
  if (snapshot.status === 'completed' && dismissedAt) return null;

  const doneCount = snapshot.completedItems + snapshot.failedItems;
  const pct = snapshot.totalItems > 0 ? Math.round((doneCount / snapshot.totalItems) * 100) : 0;

  const elapsedSec = (Date.now() - new Date(snapshot.startedAt).getTime()) / 1000;
  const avgPerItem = doneCount > 0 ? elapsedSec / doneCount : null;
  const remainingItems = snapshot.totalItems - doneCount;
  const etaSeconds = avgPerItem != null ? avgPerItem * remainingItems : NaN;

  const isRunning = snapshot.status === 'running';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <div className="rounded-[10px] border border-border bg-card shadow-lg overflow-hidden">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
          ) : (
            <Check className="h-4 w-4 shrink-0 text-sev-good-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-foreground truncate">
              {isRunning ? 'Đang đo hiệu năng theme...' : 'Đo hiệu năng hoàn tất'}
            </div>
            <div className="text-[11px] text-faint tabular-nums">
              {doneCount}/{snapshot.totalItems} · {pct}%
              {isRunning && avgPerItem != null ? ` · ETA ${formatEta(etaSeconds)}` : ''}
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {expanded && (
          <div className="max-h-[300px] overflow-y-auto border-t border-border">
            {snapshot.items.map((item, i) => (
              <div
                key={`${item.productId}-${item.deviceType}-${i}`}
                className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] border-b border-border last:border-b-0"
              >
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
        )}
      </div>
    </div>
  );
}
