'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerformanceMeasurement, Product } from '@/lib/types';
import { DeviceType } from '@/lib/types';
import { Activity, Monitor, Smartphone, Zap, Clock, Gauge, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMeasurementDate } from '@/lib/utils/date';

interface CoreWebVitalsData {
  product: Product;
  latestDesktop: PerformanceMeasurement | null;
  latestMobile: PerformanceMeasurement | null;
}

export function CoreWebVitals() {
  const [data, setData] = useState<CoreWebVitalsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  useEffect(() => {
    fetchCoreWebVitalsData();
  }, []);

  const fetchCoreWebVitalsData = async () => {
    try {
      setLoading(true);
      
      const [productsResponse, measurementsResponse] = await Promise.all([
        fetch('/api/products?active=true'),
        fetch('/api/measurements?limit=1000')
      ]);

      if (!productsResponse.ok || !measurementsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const productsData = await productsResponse.json();
      const measurementsData = await measurementsResponse.json();

      if (!productsData.success || !measurementsData.success) {
        throw new Error('Invalid response from API');
      }

      const products = productsData.data;
      const measurements = measurementsData.data;

      // Group measurements by product and device
      const productData = products.map((product: Product) => {
        const productMeasurements = measurements.filter((m: PerformanceMeasurement) => 
          m.productId === product.id
        );

        const desktopMeasurements = productMeasurements
          .filter((m: PerformanceMeasurement) => m.deviceType === 'DESKTOP')
          .sort((a: PerformanceMeasurement, b: PerformanceMeasurement) => 
            new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
          );

        const mobileMeasurements = productMeasurements
          .filter((m: PerformanceMeasurement) => m.deviceType === 'MOBILE')
          .sort((a: PerformanceMeasurement, b: PerformanceMeasurement) => 
            new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
          );

        return {
          product,
          latestDesktop: desktopMeasurements[0] || null,
          latestMobile: mobileMeasurements[0] || null,
        };
      });

      setData(productData);
    } catch (error) {
      console.error('Error fetching Core Web Vitals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatus = (value: number | null, thresholds: { good: number; needsImprovement: number }) => {
    if (value === null) return { status: 'no-data', className: 'bg-gray-100 text-gray-500', text: 'No Data' };
    
    if (value <= thresholds.good) {
      return { status: 'good', className: 'bg-green-100 text-green-800', text: 'Good' };
    } else if (value <= thresholds.needsImprovement) {
      return { status: 'needs-improvement', className: 'bg-yellow-100 text-yellow-800', text: 'Needs Improvement' };
    } else {
      return { status: 'poor', className: 'bg-red-100 text-red-800', text: 'Poor' };
    }
  };

  const formatMetricValue = (value: number | null, unit: string = 'ms') => {
    if (value === null) return 'No Data';
    
    if (unit === 'ms' && value >= 1000) {
      return `${(value / 1000).toFixed(1)}s`;
    }
    
    if (unit === 'score') {
      return value.toString();
    }
    
    if (unit === 'cls') {
      return value.toFixed(3); // Show 3 decimal places for CLS
    }
    
    return `${value}${unit}`;
  };

  // Core Web Vitals thresholds (in milliseconds, except CLS which is unitless)
  const thresholds = {
    fcp: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
    lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
    cls: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
    fid: { good: 100, needsImprovement: 300 },   // First Input Delay
    ttfb: { good: 800, needsImprovement: 1800 }, // Time to First Byte
    tbt: { good: 200, needsImprovement: 600 },   // Total Blocking Time
  };

  // Helper function to extract theme name from product name
  const getThemeName = (productName: string) => {
    return productName.split(' - ')[0].toLowerCase();
  };

  // Get unique themes for filtering
  const themes = Array.from(new Set(data.map(item => getThemeName(item.product.name))));

  const filteredData = data.filter(item => {
    if (selectedProduct !== 'all' && item.product.id !== selectedProduct) {
      return false;
    }
    if (selectedTheme !== 'all' && getThemeName(item.product.name) !== selectedTheme) {
      return false;
    }
    return true;
  });

  const getDisplayMeasurements = (item: CoreWebVitalsData) => {
    const measurements = [];
    
    if (selectedDevice === 'all' || selectedDevice === 'DESKTOP') {
      if (item.latestDesktop) {
        measurements.push(item.latestDesktop);
      }
    }
    
    if (selectedDevice === 'all' || selectedDevice === 'MOBILE') {
      if (item.latestMobile) {
        measurements.push(item.latestMobile);
      }
    }
    
    return measurements;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading Core Web Vitals...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Gauge className="h-5 w-5 mr-2 text-blue-600" />
              Core Web Vitals
            </CardTitle>
            <CardDescription>
              Real performance metrics from Google PageSpeed Insights
            </CardDescription>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {themes.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {filteredData.map((item) => (
                  <SelectItem key={item.product.id} value={item.product.id}>
                    {item.product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDevice} onValueChange={(value) => setSelectedDevice(value as DeviceType | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="DESKTOP">Desktop</SelectItem>
                <SelectItem value="MOBILE">Mobile</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={fetchCoreWebVitalsData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {filteredData.map((item) => {
            const measurements = getDisplayMeasurements(item);
            
            if (measurements.length === 0) {
              return (
                <div key={item.product.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <Badge variant="secondary">No Data</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    No measurements available for this product. Click "Test" in the products table to generate data.
                  </div>
                </div>
              );
            }

            const themeName = getThemeName(item.product.name);
            const themeColors: Record<string, string> = {
              'blum': 'bg-blue-100 text-blue-800',
              'electro': 'bg-purple-100 text-purple-800', 
              'shine': 'bg-yellow-100 text-yellow-800',
              'normcore': 'bg-gray-100 text-gray-800'
            };

            return (
              <div key={item.product.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">{item.product.name}</h3>
                    <Badge className={themeColors[themeName] || 'bg-gray-100 text-gray-800'}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <a 
                      href={item.product.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {item.product.url}
                    </a>
                  </div>
                </div>
                
                {measurements.map((measurement) => (
                  <div key={`${measurement.id}-${measurement.deviceType}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {measurement.deviceType === 'DESKTOP' ? (
                          <Monitor className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Smartphone className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="font-medium">
                          {measurement.deviceType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-lg font-bold">
                          Score: {measurement.performanceScore}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {formatMeasurementDate(measurement.measurementDate)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {/* First Contentful Paint */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-orange-500" />
                          <span className="text-xs font-medium">FCP</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatMetricValue(measurement.fcp)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.fcp, thresholds.fcp).className}
                        >
                          {getMetricStatus(measurement.fcp, thresholds.fcp).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          First Contentful Paint
                        </div>
                      </div>

                      {/* Largest Contentful Paint */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium">LCP</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatMetricValue(measurement.lcp)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.lcp, thresholds.lcp).className}
                        >
                          {getMetricStatus(measurement.lcp, thresholds.lcp).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Largest Contentful Paint
                        </div>
                      </div>

                      {/* Cumulative Layout Shift */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium">CLS</span>
                        </div>
                        <div className="text-lg font-bold">
                          {measurement.cls !== null ? measurement.cls.toFixed(3) : 'No Data'}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.cls, thresholds.cls).className}
                        >
                          {getMetricStatus(measurement.cls, thresholds.cls).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Cumulative Layout Shift
                        </div>
                      </div>

                      {/* First Input Delay */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium">FID</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatMetricValue(measurement.fid)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.fid, thresholds.fid).className}
                        >
                          {getMetricStatus(measurement.fid, thresholds.fid).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          First Input Delay
                        </div>
                      </div>

                      {/* Time to First Byte */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-red-500" />
                          <span className="text-xs font-medium">TTFB</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatMetricValue(measurement.ttfb)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.ttfb, thresholds.ttfb).className}
                        >
                          {getMetricStatus(measurement.ttfb, thresholds.ttfb).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Time to First Byte
                        </div>
                      </div>

                      {/* Total Blocking Time */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs font-medium">TBT</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatMetricValue(measurement.tbt)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getMetricStatus(measurement.tbt, thresholds.tbt).className}
                        >
                          {getMetricStatus(measurement.tbt, thresholds.tbt).text}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Total Blocking Time
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No data available for the selected filters.
          </div>
        )}
        
        {data.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <div className="space-y-2">
              <div>No performance data available yet.</div>
              <div className="text-sm">Click "Test" buttons in the products table to generate Core Web Vitals data.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
