'use client';

import { useMemo } from 'react';
import { PerformanceMeasurement, Product, DeviceType } from '@/lib/types';
import { severityForMetric, severityForScore, severityCellClasses, Severity } from '@/lib/utils/severity';
import { useProducts } from '@/lib/hooks/use-products';
import { useMeasurements } from '@/lib/hooks/use-measurements';

interface ProductMetrics {
  product: Product;
  latest: PerformanceMeasurement | null;
  // Ascending-by-date performanceScore history, used for the sparkline.
  history: number[];
}

interface CoreWebVitalsProps {
  productIds: string[]; // empty = all products
  severities: Severity[]; // empty = all severities
  device: DeviceType;
}

function formatSeconds(ms: number | null): string {
  if (ms === null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatMs(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}ms`;
}

function formatCls(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(3);
}

function sparklinePoints(history: number[], width = 60, height = 20, pad = 3): string {
  if (history.length === 0) return '';
  const n = history.length;
  return history
    .map((v, i) => {
      const x = n <= 1 ? 0 : (i / (n - 1)) * width;
      const y = height - pad - (v / 100) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function CoreWebVitals({ productIds, severities, device }: CoreWebVitalsProps) {
  const { products, isLoading: productsLoading, error: productsError } = useProducts(true);
  const { measurements, isLoading: measurementsLoading, error: measurementsError } = useMeasurements({ limit: 2000 });

  const loading = productsLoading || measurementsLoading;
  const error = productsError || measurementsError
    ? (productsError ?? measurementsError)?.message ?? 'Failed to load data'
    : null;

  const rows = useMemo<ProductMetrics[]>(() => {
    return products.map((product) => {
      const productMeasurements = measurements
        .filter((m) => m.productId === product.id && m.deviceType === device)
        .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());

      return {
        product,
        latest: productMeasurements[productMeasurements.length - 1] ?? null,
        history: productMeasurements.slice(-12).map((m) => m.performanceScore),
      };
    });
  }, [products, measurements, device]);

  const filteredRows = rows.filter((row) => {
    if (productIds.length > 0 && !productIds.includes(row.product.id)) return false;
    if (severities.length > 0) {
      const score = row.latest?.performanceScore ?? null;
      if (!severities.includes(severityForScore(score))) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="h-[220px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />;
  }

  if (error) {
    return (
      <div className="rounded-[10px] border border-sev-poor bg-card p-5 text-sm text-foreground">
        Lỗi tải bảng dữ liệu: {error}
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Không có dữ liệu phù hợp bộ lọc.
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-card overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">
              Sản phẩm
            </th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">LCP</th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">CLS</th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">FID</th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">TTFB</th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Speed Index</th>
            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Xu hướng</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const m = row.latest;
            return (
              <tr key={row.product.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-semibold text-foreground">{row.product.name}</td>
                <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${severityCellClasses(severityForMetric('lcp', m?.lcp ?? null))}`}>
                  {formatSeconds(m?.lcp ?? null)}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${severityCellClasses(severityForMetric('cls', m?.cls ?? null))}`}>
                  {formatCls(m?.cls ?? null)}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${severityCellClasses(severityForMetric('fid', m?.fid ?? null))}`}>
                  {formatMs(m?.fid ?? null)}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${severityCellClasses(severityForMetric('ttfb', m?.ttfb ?? null))}`}>
                  {formatMs(m?.ttfb ?? null)}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${severityCellClasses(severityForMetric('speedIndex', m?.speedIndex ?? null))}`}>
                  {formatSeconds(m?.speedIndex ?? null)}
                </td>
                <td className="px-4 py-2.5">
                  {row.history.length >= 2 ? (
                    <svg viewBox="0 0 60 20" className="w-[60px] h-5">
                      <polyline points={sparklinePoints(row.history)} fill="none" stroke="var(--brand)" strokeWidth={1.5} />
                    </svg>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
