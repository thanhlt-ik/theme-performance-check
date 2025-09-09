import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { PerformanceCharts } from '@/components/dashboard/performance-charts';
import { ProductList } from '@/components/dashboard/product-list';
import { CoreWebVitals } from '@/components/dashboard/core-web-vitals';
import { CronManagement } from '@/components/dashboard/cron-management';
import { ExportDialog } from '@/components/export/export-dialog';
import { NoSSR } from '@/components/no-ssr';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
        <div className="flex items-center space-x-2">
          <ExportDialog />
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Overview Cards */}
        <NoSSR fallback={<DashboardSkeleton />}>
          <DashboardOverview />
        </NoSSR>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Performance Trends
              </CardTitle>
              <CardDescription>
                Performance scores over time for all products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NoSSR fallback={<ChartSkeleton />}>
                <PerformanceCharts />
              </NoSSR>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
              <CardDescription>
                Average performance by device type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium">Desktop</span>
                </div>
                <Badge variant="secondary" className="text-green-700 bg-green-50">
                  92
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="text-sm font-medium">Mobile</span>
                </div>
                <Badge variant="secondary" className="text-yellow-700 bg-yellow-50">
                  78
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cron Job Management */}
        <NoSSR fallback={<CronSkeleton />}>
          <CronManagement />
        </NoSSR>

        {/* Core Web Vitals Section */}
        <NoSSR fallback={<CoreWebVitalsSkeleton />}>
          <CoreWebVitals />
        </NoSSR>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Monitored Products</CardTitle>
            <CardDescription>
              Performance data for all tracked Shopify theme products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NoSSR fallback={<TableSkeleton />}>
              <ProductList />
            </NoSSR>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading skeletons
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[350px] w-full bg-muted animate-pulse rounded" />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function CronSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
          <div className="h-32 w-full bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function CoreWebVitalsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-6 w-64 bg-muted animate-pulse rounded mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
