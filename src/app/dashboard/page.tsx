'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { DashboardOverview, DevicePerformancePanel } from '@/components/dashboard/dashboard-overview';
import { OverviewTrend } from '@/components/dashboard/overview-trend';
import { ExportDialog } from '@/components/export/export-dialog';
import { NoSSR } from '@/components/no-ssr';

export default function DashboardPage() {
  // Bumping this key remounts the stat/trend components below, which each
  // fetch their own data on mount — the simplest way to force a refetch
  // without introducing a shared data-fetching layer.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6 max-w-[1280px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
        <div className="flex items-center space-x-2">
          <ExportDialog />
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4" key={refreshKey}>
        <NoSSR fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4" />}>
          <DashboardOverview />
        </NoSSR>

        <div className="rounded-[10px] border border-border bg-card p-5">
          <div className="text-sm font-semibold text-foreground mb-3">Performance Trends</div>
          <NoSSR fallback={<div className="h-[180px] w-full rounded bg-muted animate-pulse" />}>
            <OverviewTrend />
          </NoSSR>
        </div>

        <NoSSR fallback={<div className="rounded-[10px] border border-border bg-muted animate-pulse h-[168px]" />}>
          <DevicePerformancePanel />
        </NoSSR>
      </div>
    </div>
  );
}
