import { NextRequest, NextResponse } from 'next/server';
import { DeviceType } from '@prisma/client';
import { getDatabaseService } from '@/lib/services/database';
import { ExportRequest } from '@/lib/types';

const db = getDatabaseService();

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { 
      productIds, 
      dateFrom, 
      dateTo, 
      deviceTypes = [DeviceType.DESKTOP, DeviceType.MOBILE], 
      format = 'csv' 
    } = body;

    // Validate date range
    let dateRange;
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format' },
          { status: 400 }
        );
      }
      
      if (from > to) {
        return NextResponse.json(
          { success: false, error: 'From date must be before to date' },
          { status: 400 }
        );
      }
      
      dateRange = { from, to };
    }

    // Get measurements for export
    const measurements = await db.getMeasurements({
      productId: productIds?.length === 1 ? productIds[0] : undefined,
      dateRange,
      limit: 10000 // Set reasonable limit for exports
    });

    // Filter by productIds if multiple specified
    const filteredMeasurements = productIds?.length 
      ? measurements.filter(m => productIds.includes(m.productId))
      : measurements;

    // Filter by device types
    const finalMeasurements = filteredMeasurements.filter(m => 
      deviceTypes.includes(m.deviceType)
    );

    if (finalMeasurements.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found for export criteria' },
        { status: 404 }
      );
    }

    // Generate export data based on format
    if (format === 'csv') {
      const csvData = generateCSV(finalMeasurements);
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="performance_data_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } 
    
    if (format === 'json') {
      const jsonData = generateJSON(finalMeasurements);
      
      return new NextResponse(jsonData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="performance_data_${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported export format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in export:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

function generateCSV(measurements: any[]): string {
  const headers = [
    'Date',
    'Product Name',
    'Product URL', 
    'Device Type',
    'Performance Score',
    'First Contentful Paint (ms)',
    'Largest Contentful Paint (ms)',
    'Cumulative Layout Shift',
    'First Input Delay (ms)',
    'Time to First Byte (ms)',
    'Speed Index',
    'Total Blocking Time (ms)'
  ];

  const csvRows = [headers.join(',')];

  for (const measurement of measurements) {
    const row = [
      formatDate(measurement.measurementDate),
      escapeCsvValue(measurement.product?.name || 'Unknown'),
      escapeCsvValue(measurement.product?.url || ''),
      measurement.deviceType,
      measurement.performanceScore,
      measurement.fcp || '',
      measurement.lcp || '',
      measurement.cls || '',
      measurement.fid || '',
      measurement.ttfb || '',
      measurement.speedIndex || '',
      measurement.tbt || ''
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

function generateJSON(measurements: any[]): string {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalRecords: measurements.length,
    data: measurements.map(measurement => ({
      date: measurement.measurementDate,
      product: {
        id: measurement.productId,
        name: measurement.product?.name,
        url: measurement.product?.url
      },
      deviceType: measurement.deviceType,
      metrics: {
        performanceScore: measurement.performanceScore,
        firstContentfulPaint: measurement.fcp,
        largestContentfulPaint: measurement.lcp,
        cumulativeLayoutShift: measurement.cls,
        firstInputDelay: measurement.fid,
        timeToFirstByte: measurement.ttfb,
        speedIndex: measurement.speedIndex,
        totalBlockingTime: measurement.tbt
      },
      rawData: {
        opportunity: measurement.opportunity,
        diagnostics: measurement.diagnostics
      }
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').split('.')[0];
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET endpoint to get export statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let dateRange;
    if (dateFrom && dateTo) {
      dateRange = {
        from: new Date(dateFrom),
        to: new Date(dateTo)
      };
    }

    const stats = await db.getMeasurementStats(dateRange);
    const products = await db.getActiveProducts();

    return NextResponse.json({
      success: true,
      data: {
        totalMeasurements: stats.total,
        averageScores: stats.averageScores,
        deviceBreakdown: stats.deviceBreakdown,
        availableProducts: products.map(p => ({
          id: p.id,
          name: p.name
        })),
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        } : null
      }
    });

  } catch (error) {
    console.error('Error getting export stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
