'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Monitor, Smartphone, Database } from 'lucide-react';


interface OverviewStats {
  totalProducts: number;
  totalMeasurements: number;
  averageDesktopScore: number;
  averageMobileScore: number;
  lastUpdated: Date | null;
  activeProducts: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Add retry mechanism for failed initial loads
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`🔄 Retrying dashboard data fetch (attempt ${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        fetchDashboardStats();
      }, 1000 * (retryCount + 1)); // Progressive delay: 1s, 2s, 3s

      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  const fetchDashboardStats = async () => {
    try {
      console.log('🚀 DashboardOverview: Starting fetch dashboard stats...');
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Add a small delay to ensure database is ready on first load
      if (retryCount === 0) {
        console.log('⏳ First fetch attempt, adding 100ms delay...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to warm up database first
        try {
          console.log('🔥 Warming up database...');
          await fetch('/api/warmup', { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5s timeout for warmup
          });
        } catch (warmupError) {
          console.warn('Warmup failed, continuing with main fetch:', warmupError);
        }
      }
      
      // Fetch products and basic stats with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Dashboard fetch timeout after 15 seconds, aborting...');
        controller.abort();
      }, 15000); // 15s timeout for Neon cold start
      
      let productsData, measurementsData;
      
      try {
        const [productsResponse, measurementsResponse] = await Promise.all([
          fetch('/api/products', { signal: controller.signal }),
          fetch('/api/measurements?limit=1000', { signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        if (!productsResponse.ok || !measurementsResponse.ok) {
          throw new Error(`Failed to fetch dashboard data: ${productsResponse.status}/${measurementsResponse.status}`);
        }

        productsData = await productsResponse.json();
        measurementsData = await measurementsResponse.json();

        if (!productsData.success || !measurementsData.success) {
          throw new Error(`Invalid response from API: products=${productsData.success}, measurements=${measurementsData.success}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle AbortError specifically
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 15 seconds - database may be sleeping');
        }
        
        throw fetchError;
      }

      const products = productsData.data;
      const measurements = measurementsData.data;

      console.log('📊 Data received:', {
        productsCount: products?.length || 0,
        measurementsCount: measurements?.length || 0,
        productsSuccess: productsData.success,
        measurementsSuccess: measurementsData.success
      });

      // Calculate averages
      const desktopMeasurements = measurements.filter((m: any) => m.deviceType === 'DESKTOP');
      const mobileMeasurements = measurements.filter((m: any) => m.deviceType === 'MOBILE');

      const averageDesktopScore = desktopMeasurements.length > 0
        ? Math.round(desktopMeasurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / desktopMeasurements.length)
        : 0;

      const averageMobileScore = mobileMeasurements.length > 0
        ? Math.round(mobileMeasurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / mobileMeasurements.length)
        : 0;

      // Find last updated date
      const lastUpdated = measurements.length > 0
        ? new Date(Math.max(...measurements.map((m: any) => new Date(m.measurementDate).getTime())))
        : null;

      const newStats = {
        totalProducts: products.length,
        activeProducts: products.filter((p: any) => p.isActive).length,
        totalMeasurements: measurements.length,
        averageDesktopScore,
        averageMobileScore,
        lastUpdated
      };

      console.log('✅ Setting dashboard stats:', newStats);
      setStats(newStats);
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      
      // Check if it's a timeout error
      const isTimeoutError = errorMessage.includes('timed out') || errorMessage.includes('timeout');
      
      // Only set error if we've exhausted retries or it's a non-retryable error
      if (retryCount >= 2 || isTimeoutError) {
        setError(isTimeoutError ? 
          'Database connection timed out. Please try refreshing the page.' : 
          errorMessage
        );
      } else {
        console.log(`Will retry dashboard fetch due to: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="col-span-4">
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            Error loading dashboard: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, className: 'bg-green-100 text-green-800' };
    if (score >= 70) return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' };
    return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' };
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Active Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeProducts}</div>
          <p className="text-xs text-muted-foreground">
            of {stats.totalProducts} total products
          </p>
        </CardContent>
      </Card>

      {/* Total Measurements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Measurements</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMeasurements.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            performance data points
          </p>
        </CardContent>
      </Card>

      {/* Desktop Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Desktop Avg</CardTitle>
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{stats.averageDesktopScore}</div>
            <Badge {...getScoreBadgeVariant(stats.averageDesktopScore)}>
              {stats.averageDesktopScore >= 90 ? 'Good' : stats.averageDesktopScore >= 70 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            average performance score
          </p>
        </CardContent>
      </Card>

      {/* Mobile Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mobile Avg</CardTitle>
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{stats.averageMobileScore}</div>
            <Badge {...getScoreBadgeVariant(stats.averageMobileScore)}>
              {stats.averageMobileScore >= 90 ? 'Good' : stats.averageMobileScore >= 70 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            average performance score
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

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
