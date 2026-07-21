'use client';

import { useMemo } from 'react';
import { severityForScore } from '@/lib/utils/severity';
import { useProducts } from '@/lib/hooks/use-products';
import { useMeasurements } from '@/lib/hooks/use-measurements';

interface OverviewStats {
  totalProducts: number;
  totalMeasurements: number;
  averageDesktopScore: number;
  averageMobileScore: number;
  activeProducts: number;
}

function useOverviewStats() {
  const { products, isLoading: productsLoading, error: productsError } = useProducts(false);
  const { measurements, isLoading: measurementsLoading, error: measurementsError } = useMeasurements({ limit: 1000 });

  const stats = useMemo<OverviewStats | null>(() => {
    if (productsLoading || measurementsLoading) return null;

    const desktopMeasurements = measurements.filter((m) => m.deviceType === 'DESKTOP');
    const mobileMeasurements = measurements.filter((m) => m.deviceType === 'MOBILE');

    const averageDesktopScore = desktopMeasurements.length > 0
      ? Math.round(desktopMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / desktopMeasurements.length)
      : 0;

    const averageMobileScore = mobileMeasurements.length > 0
      ? Math.round(mobileMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / mobileMeasurements.length)
      : 0;

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      totalMeasurements: measurements.length,
      averageDesktopScore,
      averageMobileScore,
    };
  }, [products, measurements, productsLoading, measurementsLoading]);

  return {
    stats,
    loading: productsLoading || measurementsLoading,
    error: productsError || measurementsError
      ? (productsError ?? measurementsError)?.message ?? 'Failed to load dashboard data'
      : null,
  };
}

export function DashboardOverview() {
  const { stats, loading, error } = useOverviewStats();

  if (loading) return <StatCardsSkeleton />;

  if (error) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-center text-sev-poor-foreground">
        Lỗi tải dữ liệu: {error}
      </div>
    );
  }

  if (!stats) return null;

  const desktopSeverity = severityForScore(stats.averageDesktopScore);
  const mobileSeverity = severityForScore(stats.averageMobileScore);
  const severityLabel = { good: 'Ổn định', warn: 'Cần cải thiện', poor: 'Kém' } as const;

  const cards = [
    { label: 'Active Products', value: String(stats.activeProducts), delta: `trong tổng ${stats.totalProducts} sản phẩm`, tone: 'neutral' as const },
    { label: 'Total Measurements', value: stats.totalMeasurements.toLocaleString('vi-VN'), delta: 'phép đo hiệu năng', tone: 'neutral' as const },
    { label: 'Desktop Avg', value: String(stats.averageDesktopScore), delta: severityLabel[desktopSeverity], tone: desktopSeverity },
    { label: 'Mobile Avg', value: String(stats.averageMobileScore), delta: severityLabel[mobileSeverity], tone: mobileSeverity },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[10px] border border-border bg-card px-5 py-4.5">
          <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
          <div className="mt-2 text-[28px] font-bold tracking-tight tabular-nums text-foreground">
            {card.value}
          </div>
          {card.tone === 'warn' || card.tone === 'poor' ? (
            <span
              className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                card.tone === 'warn' ? 'bg-sev-warn text-sev-warn-foreground' : 'bg-sev-poor text-sev-poor-foreground'
              }`}
            >
              {card.delta}
            </span>
          ) : (
            <div
              className={`mt-1.5 text-xs ${card.tone === 'good' ? 'text-sev-good-foreground' : 'text-faint'}`}
            >
              {card.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-border bg-card px-5 py-4.5">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-7 w-16 bg-muted animate-pulse rounded mt-2" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

export function DevicePerformancePanel() {
  const { stats, loading, error } = useOverviewStats();

  if (loading) {
    return <div className="rounded-[10px] border border-border bg-muted animate-pulse h-[168px]" />;
  }

  if (error || !stats) return null;

  const bars = [
    { label: 'Desktop', value: stats.averageDesktopScore },
    { label: 'Mobile', value: stats.averageMobileScore },
  ];

  return (
    <div className="rounded-[10px] border border-border bg-card p-5">
      <div className="text-sm font-semibold text-foreground mb-4">Device Performance</div>
      <div className="flex flex-col gap-3.5">
        {bars.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-muted-foreground">{bar.label}</span>
              <span className="font-bold tabular-nums text-foreground">{bar.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${i === 0 ? 'bg-brand' : 'bg-faint'}`}
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
