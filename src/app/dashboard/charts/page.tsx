'use client';

import { useState } from 'react';
import { PerformanceCharts, DeviceType } from '@/components/dashboard/performance-charts';
import { CoreWebVitals } from '@/components/dashboard/core-web-vitals';
import { ProductMultiSelect } from '@/components/dashboard/product-multi-select';
import { SeverityFilterChips } from '@/components/dashboard/severity-filter-chips';
import { NoSSR } from '@/components/no-ssr';
import { Severity } from '@/lib/utils/severity';
import { useProducts } from '@/lib/hooks/use-products';

export default function AnalyticsPage() {
  const { products } = useProducts(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [device, setDevice] = useState<DeviceType>('DESKTOP');

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6 max-w-[1280px]">
      <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>

      <div className="flex flex-wrap items-center gap-2.5">
        <ProductMultiSelect products={products} selected={productIds} onChange={setProductIds} />

        <div className="flex gap-1 bg-muted p-[3px] rounded-lg">
          {(['DESKTOP', 'MOBILE'] as DeviceType[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                device === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {d === 'DESKTOP' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>

        <SeverityFilterChips value={severities} onChange={setSeverities} />
      </div>

      <div className="rounded-[10px] border border-border bg-card p-5">
        <NoSSR fallback={<div className="h-[220px] w-full rounded bg-muted animate-pulse" />}>
          <PerformanceCharts productIds={productIds} allProducts={products} device={device} />
        </NoSSR>
      </div>

      <NoSSR fallback={<div className="h-[220px] w-full rounded-[10px] border border-border bg-muted animate-pulse" />}>
        <CoreWebVitals productIds={productIds} severities={severities} device={device} />
      </NoSSR>
    </div>
  );
}
