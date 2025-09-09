'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar as CalendarIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ExportState {
  dateFrom: Date | null;
  dateTo: Date | null;
  format: 'csv' | 'json';
  productIds: string[];
  deviceTypes: ('DESKTOP' | 'MOBILE')[];
}

export function ExportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  
  const [exportState, setExportState] = useState<ExportState>({
    dateFrom: null,
    dateTo: null,
    format: 'csv',
    productIds: [],
    deviceTypes: ['DESKTOP', 'MOBILE']
  });

  // Fetch products when dialog opens
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && products.length === 0) {
      try {
        const response = await fetch('/api/products?active=true');
        const data = await response.json();
        if (data.success) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('idle');

      const exportData = {
        dateFrom: exportState.dateFrom?.toISOString(),
        dateTo: exportState.dateTo?.toISOString(),
        format: exportState.format,
        productIds: exportState.productIds.length > 0 ? exportState.productIds : undefined,
        deviceTypes: exportState.deviceTypes
      };

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `performance_data_${new Date().toISOString().split('T')[0]}.${exportState.format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportStatus('success');
      
      // Close dialog after successful export
      setTimeout(() => {
        setIsOpen(false);
        setExportStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  const isExportValid = () => {
    // Basic validation
    if (exportState.dateFrom && exportState.dateTo && exportState.dateFrom > exportState.dateTo) {
      return false;
    }
    return true;
  };

  const getExportSummary = () => {
    const parts = [];
    
    if (exportState.productIds.length > 0) {
      parts.push(`${exportState.productIds.length} products`);
    } else {
      parts.push('All products');
    }

    if (exportState.dateFrom && exportState.dateTo) {
      parts.push(`${format(exportState.dateFrom, 'MMM d')} - ${format(exportState.dateTo, 'MMM d')}`);
    } else if (exportState.dateFrom) {
      parts.push(`From ${format(exportState.dateFrom, 'MMM d')}`);
    } else if (exportState.dateTo) {
      parts.push(`Until ${format(exportState.dateTo, 'MMM d')}`);
    } else {
      parts.push('All dates');
    }

    parts.push(`${exportState.deviceTypes.join(' + ')}`);
    parts.push(exportState.format.toUpperCase());

    return parts.join(' • ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Performance Data</DialogTitle>
          <DialogDescription>
            Export your performance measurements to CSV or JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range (optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowFromCalendar(!showFromCalendar)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportState.dateFrom ? format(exportState.dateFrom, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                  {showFromCalendar && (
                    <div className="absolute z-50 mt-1">
                      <Calendar
                        mode="single"
                        selected={exportState.dateFrom || undefined}
                        onSelect={(date) => {
                          setExportState(prev => ({ ...prev, dateFrom: date || null }));
                          setShowFromCalendar(false);
                        }}
                        className="rounded-md border bg-white shadow-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowToCalendar(!showToCalendar)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportState.dateTo ? format(exportState.dateTo, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                  {showToCalendar && (
                    <div className="absolute z-50 mt-1">
                      <Calendar
                        mode="single"
                        selected={exportState.dateTo || undefined}
                        onSelect={(date) => {
                          setExportState(prev => ({ ...prev, dateTo: date || null }));
                          setShowToCalendar(false);
                        }}
                        className="rounded-md border bg-white shadow-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Selection */}
          <div className="space-y-2">
            <Label>Products (leave empty for all)</Label>
            <Select 
              onValueChange={(value) => {
                if (value && !exportState.productIds.includes(value)) {
                  setExportState(prev => ({ 
                    ...prev, 
                    productIds: [...prev.productIds, value] 
                  }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select products to include" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {exportState.productIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {exportState.productIds.map((productId) => {
                  const product = products.find(p => p.id === productId);
                  return (
                    <Badge key={productId} variant="secondary" className="cursor-pointer">
                      {product?.name || productId}
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => setExportState(prev => ({
                          ...prev,
                          productIds: prev.productIds.filter(id => id !== productId)
                        }))}
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Device Types */}
          <div className="space-y-2">
            <Label>Device Types</Label>
            <div className="flex gap-2">
              {['DESKTOP', 'MOBILE'].map((deviceType) => (
                <Badge
                  key={deviceType}
                  variant={exportState.deviceTypes.includes(deviceType as any) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setExportState(prev => ({
                      ...prev,
                      deviceTypes: prev.deviceTypes.includes(deviceType as any)
                        ? prev.deviceTypes.filter(dt => dt !== deviceType)
                        : [...prev.deviceTypes, deviceType as any]
                    }));
                  }}
                >
                  {deviceType}
                </Badge>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={exportState.format} 
              onValueChange={(value: 'csv' | 'json') => setExportState(prev => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Export Summary:</div>
            <div className="text-sm text-muted-foreground">{getExportSummary()}</div>
          </div>

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Export completed successfully!</span>
            </div>
          )}
          
          {exportStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Export failed. Please try again.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!isExportValid() || isExporting || exportState.deviceTypes.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
