'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint, PerformanceMeasurement } from '@/lib/types';
import { formatShortDate, dayRangeISO } from '@/lib/utils/date';
import { categoricalColor } from '@/lib/utils/chart-palette';
import { useTheme } from '@/lib/hooks/use-theme';
import { useMeasurements } from '@/lib/hooks/use-measurements';
import { RangeToggle } from '@/components/dashboard/range-toggle';

export type DeviceType = 'DESKTOP' | 'MOBILE';

const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

// Caps how many lines render at once in compare mode — matches the size of
// the validated categorical palette (see chart-palette.ts).
const MAX_COMPARE_SERIES = 8;

interface CompareProduct {
  id: string;
  name: string;
}

interface PerformanceChartsProps {
  productIds: string[]; // empty = all products, aggregated into one line
  allProducts: CompareProduct[];
  device: DeviceType;
}

export function PerformanceCharts({ productIds, allProducts, device }: PerformanceChartsProps) {
  const { theme } = useTheme();
  const [days, setDays] = useState(30);

  const isCompare = productIds.length > 1;
  const { dateFrom, dateTo } = useMemo(() => dayRangeISO(days), [days]);

  // Single-product selection can be filtered server-side; comparing multiple
  // products fetches the broader set and groups client-side, same pattern
  // already used by the Core Web Vitals table.
  const singleProductId = productIds.length === 1 ? productIds[0] : undefined;
  const { measurements: rawMeasurements, isLoading: loading, error: fetchError } = useMeasurements({
    dateFrom,
    dateTo,
    limit: 2000,
    productId: singleProductId,
  });
  const error = fetchError ? fetchError.message : null;

  const chartData = useMemo(() => transformMeasurementsToChartData(rawMeasurements), [rawMeasurements]);

  function transformMeasurementsToChartData(measurements: PerformanceMeasurement[]): ChartDataPoint[] {
    const grouped = measurements.reduce((acc: Record<string, any>, measurement) => {
      const date = new Date(measurement.measurementDate).toISOString().split('T')[0];
      const key = `${date}-${measurement.deviceType}`;
      if (!acc[key]) acc[key] = { date, deviceType: measurement.deviceType, measurements: [] };
      acc[key].measurements.push(measurement);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group: any) => ({
        date: group.date,
        performanceScore: Math.round(
          group.measurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / group.measurements.length
        ),
        deviceType: group.deviceType,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const deviceData = chartData.filter((d) => d.deviceType === device);
  const deviceLabel = device === 'DESKTOP' ? 'Desktop' : 'Mobile';
  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === days)?.label ?? `${days}d`;

  // Series get a color from their stable position in the full product list —
  // not selection order — so toggling one product on/off never repaints
  // the colors of the others already shown.
  const compareSeries = isCompare
    ? productIds
        .map((id) => ({
          id,
          name: allProducts.find((p) => p.id === id)?.name ?? id,
          colorIndex: allProducts.findIndex((p) => p.id === id),
        }))
        .sort((a, b) => a.colorIndex - b.colorIndex)
        .slice(0, MAX_COMPARE_SERIES)
    : [];

  const compareData = isCompare
    ? buildCompareData(rawMeasurements, compareSeries.map((s) => s.id), device)
    : [];

  const singleProductName = productIds.length === 1 ? allProducts.find((p) => p.id === productIds[0])?.name : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-sm font-semibold text-foreground">
          Trend — {singleProductName ?? deviceLabel} · {rangeLabel}
        </div>
        <RangeToggle value={days} options={RANGE_OPTIONS} onChange={setDays} />
      </div>

      {loading ? (
        <div className="h-[220px] w-full rounded bg-muted animate-pulse" />
      ) : error ? (
        <div className="h-[220px] w-full flex items-center justify-center text-sm text-sev-poor-foreground">
          Lỗi: {error}
        </div>
      ) : isCompare ? (
        compareData.length === 0 ? (
          <div className="h-[220px] w-full flex items-center justify-center text-sm text-muted-foreground">
            Không có dữ liệu phù hợp bộ lọc.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={compareData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatShortDate(date)}
                  tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  labelFormatter={(date) => formatShortDate(date as string)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                {compareSeries.map((s) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    name={s.name}
                    stroke={categoricalColor(s.colorIndex, theme)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {compareSeries.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoricalColor(s.colorIndex, theme) }}
                  />
                  {s.name}
                </span>
              ))}
            </div>
            {productIds.length > MAX_COMPARE_SERIES && (
              <div className="text-xs text-muted-foreground">
                Đang hiển thị {MAX_COMPARE_SERIES}/{productIds.length} theme trên biểu đồ — thu hẹp lựa chọn để xem đủ.
              </div>
            )}
          </>
        )
      ) : deviceData.length === 0 ? (
        <div className="h-[220px] w-full flex items-center justify-center text-sm text-muted-foreground">
          Không có dữ liệu phù hợp bộ lọc.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={deviceData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatShortDate(date)}
              tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
            <Tooltip
              labelFormatter={(date) => formatShortDate(date as string)}
              formatter={(value) => [`${value}`, 'Performance Score']}
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="performanceScore" stroke="var(--brand)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function buildCompareData(measurements: any[], productIds: string[], device: DeviceType): Array<Record<string, any>> {
  const idSet = new Set(productIds);
  const byDate = new Map<string, Record<string, number[]>>();

  for (const m of measurements) {
    if (m.deviceType !== device || !idSet.has(m.productId)) continue;
    const date = new Date(m.measurementDate).toISOString().split('T')[0];
    if (!byDate.has(date)) byDate.set(date, {});
    const bucket = byDate.get(date)!;
    if (!bucket[m.productId]) bucket[m.productId] = [];
    bucket[m.productId].push(m.performanceScore);
  }

  return Array.from(byDate.entries())
    .map(([date, scoresByProduct]) => {
      const row: Record<string, any> = { date };
      for (const id of productIds) {
        const scores = scoresByProduct[id];
        if (scores?.length) row[id] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
      return row;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
