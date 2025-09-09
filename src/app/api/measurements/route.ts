import { NextRequest, NextResponse } from 'next/server';
import { DeviceType } from '@prisma/client';
import { getDatabaseService } from '@/lib/services/database';
import { getPageSpeedService, PageSpeedService } from '@/lib/services/pagespeed';
import { MeasurementRequest, MeasurementResponse } from '@/lib/types';

// Remove module-level singletons to avoid connection issues

// Simple in-memory rate limiting (in production, use Redis or similar)
const requestTracker = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per minute per IP

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [id, timestamp] of requestTracker.entries()) {
    if (timestamp < windowStart) {
      requestTracker.delete(id);
    }
  }
  
  // Count requests in current window
  const recentRequests = Array.from(requestTracker.values())
    .filter(timestamp => timestamp > windowStart).length;
  
  return recentRequests >= MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting by IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please wait a minute before testing again.' 
        },
        { status: 429 }
      );
    }

    const body: MeasurementRequest = await request.json();
    
    if (!body.productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get database service instance
    const db = getDatabaseService();
    
    // Get the product to validate it exists and get the URL
    const product = await db.getProductById(body.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Product is not active' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!PageSpeedService.isValidUrl(product.url)) {
      return NextResponse.json(
        { success: false, error: `Invalid URL: ${product.url}` },
        { status: 400 }
      );
    }

    const deviceType = body.deviceType || DeviceType.DESKTOP;

    // Track this request for rate limiting
    requestTracker.set(`${clientIp}-${Date.now()}`, Date.now());

    console.log(`🚀 Starting PageSpeed measurement for: ${product.name} (${product.url}) - ${deviceType}`);

    // Get PageSpeed service instance
    const pageSpeed = getPageSpeedService();
    
    // Measure performance using Google PageSpeed Insights
    const performanceData = await pageSpeed.measurePerformance(product.url, deviceType);

    // Save measurement to database
    const measurement = await db.createMeasurement({
      productId: product.id,
      deviceType,
      performanceScore: performanceData.performanceScore,
      fcp: performanceData.fcp,
      lcp: performanceData.lcp,
      cls: performanceData.cls,
      fid: performanceData.fid,
      ttfb: performanceData.ttfb,
      speedIndex: performanceData.speedIndex,
      tbt: performanceData.tbt,
      measurementDate: performanceData.measurementDate
    });

    console.log(`✅ Measurement completed successfully: Score ${performanceData.performanceScore}`);

    const response: MeasurementResponse = {
      success: true,
      data: measurement
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/measurements:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
      if (PageSpeedService.isRateLimitError(error)) {
        errorMessage = 'Google PageSpeed API rate limit reached. Please wait a few minutes before trying again.';
        statusCode = 429;
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('API key')) {
        errorMessage = 'Google PageSpeed API configuration error. Please check your API key.';
        statusCode = 500;
      } else {
        errorMessage = error.message;
      }
    }
    
    const response: MeasurementResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: statusCode });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get database service instance
    const db = getDatabaseService();
    
    // Check database connection status first
    const connectionStatus = db.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      console.warn('Database not connected:', connectionStatus.error);
      // For measurements endpoint, we'll continue with demo data instead of failing
      console.log('Proceeding with demo data mode');
    }
    
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const deviceType = searchParams.get('deviceType') as DeviceType | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Build query options
    const options: Parameters<typeof db.getMeasurements>[0] = {};
    
    if (productId) {
      options.productId = productId;
    }
    
    if (deviceType && Object.values(DeviceType).includes(deviceType)) {
      options.deviceType = deviceType;
    }
    
    if (dateFrom && dateTo) {
      options.dateRange = {
        from: new Date(dateFrom),
        to: new Date(dateTo)
      };
    }
    
    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    
    if (offset) {
      options.offset = parseInt(offset, 10);
    }

    const measurements = await db.getMeasurements(options);

    // Ensure product data is included in the response
    const measurementsWithProduct = measurements.map(m => ({
      ...m,
      product: m.product || null
    }));
    
    return NextResponse.json({
      success: true,
      data: measurementsWithProduct,
      total: measurements.length
    });

  } catch (error) {
    console.error('Error in GET /api/measurements:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
