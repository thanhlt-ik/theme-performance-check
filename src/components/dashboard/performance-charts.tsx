'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Monitor, Smartphone } from 'lucide-react';
import { ChartDataPoint, ProductChartData } from '@/lib/types';
import { formatShortDate } from '@/lib/utils/date';

interface ChartFilters {
  productId: string;
  days: number;
  metric: 'performanceScore' | 'fcp' | 'lcp' | 'cls';
}

export function PerformanceCharts() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChartFilters>({
    productId: 'all',
    days: 30,
    metric: 'performanceScore'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      fetchChartData();
    }
  }, [filters, products]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?active=true');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        if (data.data.length > 0) {
          setFilters(prev => ({ ...prev, productId: data.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      
      const now = Date.now();
      const dateFrom = new Date(now - (filters.days * 24 * 60 * 60 * 1000));
      
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString(),
        dateTo: new Date(now).toISOString(),
        limit: '1000'
      });

      if (filters.productId !== 'all') {
        params.append('productId', filters.productId);
      }

      const response = await fetch(`/api/measurements?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch measurements');
      
      const data = await response.json();
      if (!data.success) throw new Error('Invalid response');

      // Transform data for charts
      const transformedData = transformMeasurementsToChartData(data.data);
      setChartData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const transformMeasurementsToChartData = (measurements: any[]): ChartDataPoint[] => {
    // Group measurements by date and device type
    const groupedData = measurements.reduce((acc, measurement) => {
      const date = new Date(measurement.measurementDate).toISOString().split('T')[0];
      const key = `${date}-${measurement.deviceType}`;
      
      if (!acc[key]) {
        acc[key] = {
          date,
          deviceType: measurement.deviceType,
          measurements: []
        };
      }
      
      acc[key].measurements.push(measurement);
      return acc;
    }, {});

    // Calculate averages and create chart data points
    return Object.values(groupedData).map((group: any) => {
      const measurements = group.measurements;
      const avgScore = Math.round(
        measurements.reduce((sum: number, m: any) => sum + m.performanceScore, 0) / measurements.length
      );
      
      return {
        date: group.date,
        performanceScore: avgScore,
        fcp: Math.round(measurements.reduce((sum: number, m: any) => sum + (m.fcp || 0), 0) / measurements.length),
        lcp: Math.round(measurements.reduce((sum: number, m: any) => sum + (m.lcp || 0), 0) / measurements.length),
        cls: Number((measurements.reduce((sum: number, m: any) => sum + (m.cls || 0), 0) / measurements.length).toFixed(3)),
        deviceType: group.deviceType
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getMetricConfig = (metric: string) => {
    switch (metric) {
      case 'performanceScore':
        return { label: 'Performance Score', color: '#3b82f6', unit: '', yDomain: [0, 100] };
      case 'fcp':
        return { label: 'First Contentful Paint', color: '#10b981', unit: 'ms', yDomain: [0, 'dataMax'] };
      case 'lcp':
        return { label: 'Largest Contentful Paint', color: '#f59e0b', unit: 'ms', yDomain: [0, 'dataMax'] };
      case 'cls':
        return { label: 'Cumulative Layout Shift', color: '#ef4444', unit: '', yDomain: [0, 'dataMax'] };
      default:
        return { label: 'Performance Score', color: '#3b82f6', unit: '', yDomain: [0, 100] };
    }
  };

  if (loading) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  const metricConfig = getMetricConfig(filters.metric);
  const desktopData = chartData.filter(d => d.deviceType === 'DESKTOP');
  const mobileData = chartData.filter(d => d.deviceType === 'MOBILE');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={filters.productId} onValueChange={(value) => setFilters(prev => ({ ...prev, productId: value }))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.days.toString()} onValueChange={(value) => setFilters(prev => ({ ...prev, days: parseInt(value) }))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.metric} onValueChange={(value: any) => setFilters(prev => ({ ...prev, metric: value }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="performanceScore">Performance Score</SelectItem>
            <SelectItem value="fcp">First Contentful Paint</SelectItem>
            <SelectItem value="lcp">Largest Contentful Paint</SelectItem>
            <SelectItem value="cls">Cumulative Layout Shift</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => fetchChartData()}>
          <Calendar className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              type="category"
              allowDuplicatedCategory={false}
              tickFormatter={(date) => formatShortDate(date)}
            />
            <YAxis 
              domain={metricConfig.yDomain as any}
              label={{ value: `${metricConfig.label} (${metricConfig.unit})`, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              labelFormatter={(date) => formatShortDate(date)}
              formatter={(value, name) => [
                `${value}${metricConfig.unit}`, 
                name === 'desktop' ? 'Desktop' : 'Mobile'
              ]}
            />
            <Legend />
            <Line
              dataKey={filters.metric}
              data={desktopData}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="desktop"
              connectNulls={false}
            />
            <Line
              dataKey={filters.metric}
              data={mobileData}
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              name="mobile"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-500" />
          <span className="text-sm">Desktop Avg:</span>
          <Badge variant="secondary">
            {desktopData.length > 0 
              ? Math.round(desktopData.reduce((sum, d) => sum + (d[filters.metric] || 0), 0) / desktopData.length)
              : 'No data'
            }{metricConfig.unit}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-purple-500" />
          <span className="text-sm">Mobile Avg:</span>
          <Badge variant="secondary">
            {mobileData.length > 0 
              ? Math.round(mobileData.reduce((sum, d) => sum + (d[filters.metric] || 0), 0) / mobileData.length)
              : 'No data'
            }{metricConfig.unit}
          </Badge>
        </div>
      </div>
    </div>
  );
}
