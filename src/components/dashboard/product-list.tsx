'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ExternalLink, 
  Monitor, 
  Smartphone, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Play,
  RefreshCw
} from 'lucide-react';
import { ProductPerformanceData } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/date';

export function ProductList() {
  const [products, setProducts] = useState<ProductPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/products?active=true');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      if (!data.success) throw new Error('Invalid response');

      // Get latest measurements for each product
      const productsWithData = await Promise.all(
        data.data.map(async (product: any) => {
          try {
            const measurementsResponse = await fetch(`/api/measurements?productId=${product.id}&limit=10`);
            if (!measurementsResponse.ok) {
              return {
                product,
                latestDesktop: null,
                latestMobile: null,
                measurements: [],
                averageScore: { desktop: 0, mobile: 0 }
              };
            }

            const measurementsData = await measurementsResponse.json();
            const measurements = measurementsData.success ? measurementsData.data : [];

            // Find latest measurements by device type
            const desktopMeasurements = measurements.filter((m: any) => m.deviceType === 'DESKTOP');
            const mobileMeasurements = measurements.filter((m: any) => m.deviceType === 'MOBILE');

            const latestDesktop = desktopMeasurements.length > 0 ? desktopMeasurements[0] : null;
            const latestMobile = mobileMeasurements.length > 0 ? mobileMeasurements[0] : null;

            // Calculate averages
            const avgDesktop = desktopMeasurements.length > 0 
              ? Math.round(desktopMeasurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / desktopMeasurements.length)
              : 0;
            const avgMobile = mobileMeasurements.length > 0
              ? Math.round(mobileMeasurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / mobileMeasurements.length)
              : 0;

            return {
              product,
              latestDesktop,
              latestMobile,
              measurements: measurements.slice(0, 5), // Keep recent measurements for trend analysis
              averageScore: { desktop: avgDesktop, mobile: avgMobile }
            };
          } catch (err) {
            console.error(`Error fetching data for product ${product.name}:`, err);
            return {
              product,
              latestDesktop: null,
              latestMobile: null,
              measurements: [],
              averageScore: { desktop: 0, mobile: 0 }
            };
          }
        })
      );

      setProducts(productsWithData);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const runMeasurement = async (productId: string, deviceType: 'DESKTOP' | 'MOBILE') => {
    try {
      setRefreshing(productId);
      
      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, deviceType })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to run measurement`);
      }

      console.log(`✅ Measurement completed for product ${productId}:`, result.data);
      
      // Refresh the data
      await fetchProducts();
      
      // Show success message
      alert(`✅ Measurement completed successfully!\nScore: ${result.data.performanceScore}\nDevice: ${deviceType}`);
      
    } catch (err) {
      console.error('Error running measurement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`❌ Measurement failed: ${errorMessage}`);
      // You could show a toast notification here
    } finally {
      setRefreshing(null);
    }
  };

  const getScoreBadge = (score: number | null | undefined) => {
    if (!score) return <Badge variant="secondary">No data</Badge>;
    
    if (score >= 90) {
      return <Badge className="bg-green-100 text-green-800">Good ({score})</Badge>;
    } else if (score >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">Needs Work ({score})</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Poor ({score})</Badge>;
    }
  };

  const getTrend = (measurements: any[], deviceType: string) => {
    const deviceMeasurements = measurements
      .filter(m => m.deviceType === deviceType)
      .slice(0, 3); // Last 3 measurements

    if (deviceMeasurements.length < 2) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }

    const latest = deviceMeasurements[0].performanceScore;
    const previous = deviceMeasurements[1].performanceScore;
    const diff = latest - previous;

    if (diff > 5) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (diff < -5) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatLastUpdated = (measurement: any) => {
    if (!measurement) return 'Never';
    return formatRelativeTime(measurement.measurementDate);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <Button onClick={() => fetchProducts()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No active products found. Add some products to start monitoring.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {products.length} active products
        </div>
        <Button onClick={() => fetchProducts()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-center">Desktop</TableHead>
            <TableHead className="text-center">Mobile</TableHead>
            <TableHead className="text-center">Last Updated</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((productData) => (
            <TableRow key={productData.product.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{productData.product.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <a 
                      href={productData.product.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      {productData.product.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-500" />
                  {getScoreBadge(productData.latestDesktop?.performanceScore)}
                  {getTrend(productData.measurements, 'DESKTOP')}
                </div>
              </TableCell>
              
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-500" />
                  {getScoreBadge(productData.latestMobile?.performanceScore)}
                  {getTrend(productData.measurements, 'MOBILE')}
                </div>
              </TableCell>
              
              <TableCell className="text-center text-sm text-muted-foreground">
                {formatLastUpdated(productData.latestDesktop || productData.latestMobile)}
              </TableCell>
              
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runMeasurement(productData.product.id, 'DESKTOP')}
                    disabled={refreshing === productData.product.id}
                  >
                    <Monitor className="h-3 w-3 mr-1" />
                    {refreshing === productData.product.id ? 'Running...' : 'Test'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runMeasurement(productData.product.id, 'MOBILE')}
                    disabled={refreshing === productData.product.id}
                  >
                    <Smartphone className="h-3 w-3 mr-1" />
                    {refreshing === productData.product.id ? 'Running...' : 'Test'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
