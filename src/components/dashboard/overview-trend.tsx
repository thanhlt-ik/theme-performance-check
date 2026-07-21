'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { formatShortDate, dayRangeISO } from '@/lib/utils/date';
import { RangeToggle } from '@/components/dashboard/range-toggle';
import { FamilyFilterChips } from '@/components/dashboard/family-filter-chips';
import { useMeasurements } from '@/lib/hooks/use-measurements';
import { useProducts } from '@/lib/hooks/use-products';
import { productFamily, uniqueFamilies } from '@/lib/utils/product-family';
import { categoricalColor } from '@/lib/utils/chart-palette';
import { useTheme } from '@/lib/hooks/use-theme';
import { DeviceType } from '@/lib/types';

const RANGE_OPTIONS = [
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

const DEVICE_OPTIONS: { value: DeviceType; label: string }[] = [
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'MOBILE', label: 'Mobile' },
];

export function OverviewTrend() {
  const { theme } = useTheme();
  const { products } = useProducts(true);
  const [rangeDays, setRangeDays] = useState(RANGE_OPTIONS[0].value);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [device, setDevice] = useState<DeviceType>('DESKTOP');

  const { dateFrom, dateTo } = useMemo(() => dayRangeISO(rangeDays), [rangeDays]);
  const { measurements, isLoading: loading, error: fetchError } = useMeasurements({ dateFrom, dateTo, limit: 2000 });
  const error = fetchError ? fetchError.message : null;

  const families = useMemo(() => uniqueFamilies(products.map((p) => p.name)), [products]);
  const familyById = useMemo(() => new Map(products.map((p) => [p.id, productFamily(p.name)])), [products]);

  const isCompare = selectedFamilies.length > 0;

  // Aggregate mode: one Desktop line + one Mobile line, averaged across
  // every active theme — the "at a glance" default.
  const aggregateData = useMemo(() => {
    if (isCompare) return [];
    const byDate = new Map<string, { desktop: number[]; mobile: number[] }>();
    for (const m of measurements) {
      const day = new Date(m.measurementDate).toISOString().split('T')[0];
      if (!byDate.has(day)) byDate.set(day, { desktop: [], mobile: [] });
      const bucket = byDate.get(day)!;
      if (m.deviceType === 'DESKTOP') bucket.desktop.push(m.performanceScore);
      else if (m.deviceType === 'MOBILE') bucket.mobile.push(m.performanceScore);
    }
    const avg = (values: number[]) =>
      values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
    return Array.from(byDate.entries())
      .map(([date, bucket]) => ({ date, desktop: avg(bucket.desktop), mobile: avg(bucket.mobile) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements, isCompare]);

  // Compare mode: one line per selected family, for the chosen device only —
  // mixing families and both devices on one chart would be unreadable.
  const compareData = useMemo(() => {
    if (!isCompare) return [];
    const byDate = new Map<string, Record<string, number[]>>();
    for (const m of measurements) {
      if (m.deviceType !== device) continue;
      const family = familyById.get(m.productId);
      if (!family || !selectedFamilies.includes(family)) continue;
      const day = new Date(m.measurementDate).toISOString().split('T')[0];
      if (!byDate.has(day)) byDate.set(day, {});
      const bucket = byDate.get(day)!;
      if (!bucket[family]) bucket[family] = [];
      bucket[family].push(m.performanceScore);
    }
    return Array.from(byDate.entries())
      .map(([date, byFamily]) => {
        const row: Record<string, any> = { date };
        for (const family of selectedFamilies) {
          const scores = byFamily[family];
          if (scores?.length) row[family] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
        return row;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements, isCompare, device, familyById, selectedFamilies]);

  const data = isCompare ? compareData : aggregateData;
  const isEmpty = data.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FamilyFilterChips families={families} selected={selectedFamilies} onChange={setSelectedFamilies} />
        <div className="flex items-center gap-2">
          {isCompare && (
            <div className="flex gap-1 bg-muted p-[3px] rounded-lg">
              {DEVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDevice(opt.value)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    device === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <RangeToggle value={rangeDays} options={RANGE_OPTIONS} onChange={setRangeDays} />
        </div>
      </div>

      {loading ? (
        <div className="h-[180px] w-full rounded bg-muted animate-pulse" />
      ) : error ? (
        <div className="h-[180px] w-full flex items-center justify-center text-sm text-sev-poor-foreground">
          Không thể tải dữ liệu: {error}
        </div>
      ) : isEmpty ? (
        <div className="h-[180px] w-full flex items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu đo trong {rangeDays} ngày qua.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatShortDate(d)}
              tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) => formatShortDate(d as string)}
            />
            {isCompare
              ? selectedFamilies.map((family) => (
                  <Line
                    key={family}
                    type="monotone"
                    dataKey={family}
                    name={family}
                    stroke={categoricalColor(families.indexOf(family), theme)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))
              : [
                  <Line key="desktop" type="monotone" dataKey="desktop" name="Desktop" stroke="var(--brand)" strokeWidth={2.5} dot={false} connectNulls />,
                  <Line key="mobile" type="monotone" dataKey="mobile" name="Mobile" stroke="var(--text-faint)" strokeWidth={2.5} dot={false} connectNulls />,
                ]}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {isCompare
          ? selectedFamilies.map((family) => (
              <span key={family} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: categoricalColor(families.indexOf(family), theme) }}
                />
                {family}
              </span>
            ))
          : (
            <>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand" /> Desktop</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-faint" /> Mobile</span>
            </>
          )}
      </div>
    </div>
  );
}
