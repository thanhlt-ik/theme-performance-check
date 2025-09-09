import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { PageSpeedService } from '@/lib/services/pagespeed';
import { DeviceType } from '@prisma/client';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return false;
  }

  const token = authHeader.substring(7);
  return token === cronSecret;
}

// Function to split products into smaller batches
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

// Function to handle measurements in background
async function processMeasurements(products: any[], databaseService: any, jobId: string) {
  try {
    console.log(`🕐 [Job ${jobId}] Processing measurements in background...`);
    const startTime = Date.now();

    const pageSpeedService = new PageSpeedService();
    const results = [];
    const deviceTypes = ['DESKTOP', 'MOBILE'] as DeviceType[];
    
    // Split product list into batches to avoid too many consecutive requests
    const BATCH_SIZE = 3; // Each batch processes maximum 3 products
    const productBatches = chunkArray(products, BATCH_SIZE);
    const totalBatches = productBatches.length;
    
    console.log(`📦 [Job ${jobId}] Processing ${products.length} products in ${totalBatches} batches of ${BATCH_SIZE}`);
    
    let batchIndex = 0;
    // Process each batch of products
    for (const batch of productBatches) {
      batchIndex++;
      console.log(`📋 [Job ${jobId}] Starting batch ${batchIndex}/${totalBatches} with ${batch.length} products`);
      
      // If not the first batch, add rest time between batches
      if (batchIndex > 1) {
        const batchDelayMs = 60000; // 60 seconds rest between batches
        console.log(`⏱️ [Job ${jobId}] Waiting ${batchDelayMs/1000}s between batches...`);
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
      
      // Process products in this batch
      for (const product of batch) {
        console.log(`🔍 [Job ${jobId}] Measuring ${product.name}... (batch ${batchIndex}/${totalBatches})`);
        
        for (const deviceType of deviceTypes) {
          try {
            // Add delay to respect API rate limits
            if (results.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }

            const measurement = await pageSpeedService.measurePerformance(
              product.url,
              deviceType
            );

            // Save to database
            const savedMeasurement = await databaseService.createMeasurement({
              productId: product.id,
              deviceType,
              performanceScore: measurement.performanceScore,
              fcp: measurement.fcp,
              lcp: measurement.lcp,
              cls: measurement.cls,
              fid: measurement.fid,
              ttfb: measurement.ttfb,
              speedIndex: measurement.speedIndex,
              tbt: measurement.tbt,
              opportunity: null, // PageSpeed service doesn't return this
              diagnostics: null, // PageSpeed service doesn't return this
              measurementDate: new Date()
            });

            results.push({
              product: product.name,
              deviceType,
              score: measurement.performanceScore,
              success: true,
              measurementId: savedMeasurement.id
            });

            console.log(`✅ [Job ${jobId}] ${product.name} (${deviceType}): Score ${measurement.performanceScore}`);

          } catch (error) {
            console.error(`❌ [Job ${jobId}] Failed to measure ${product.name} (${deviceType}):`, error);
            results.push({
              product: product.name,
              deviceType,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`🎉 [Job ${jobId}] Cron job completed in ${Math.round(duration / 1000)}s`);
    console.log(`📈 [Job ${jobId}] Success: ${successCount}, Failed: ${failureCount}`);

    // Log summary to database
    try {
      await databaseService.setConfig('last_cron_run', new Date().toISOString());
      await databaseService.setConfig('last_cron_results', JSON.stringify({
        totalProducts: products.length,
        successCount,
        failureCount,
        duration,
        timestamp: new Date().toISOString(),
        jobId
      }));
    } catch (configError) {
      console.warn(`[Job ${jobId}] Failed to save cron run summary:`, configError);
    }
    
    return {
      success: true,
      jobId,
      results,
      summary: {
        totalProducts: products.length,
        totalMeasurements: results.length,
        successCount,
        failureCount,
        duration: `${Math.round(duration / 1000)}s`
      }
    };
  } catch (error) {
    console.error(`❌ [Job ${jobId}] Background processing failed:`, error);
    return {
      success: false,
      jobId,
      error: error instanceof Error ? error.message : 'Unknown background processing error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Starting automated performance measurements...');
    const startTime = Date.now();
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const databaseService = getDatabaseService();

    // Get all active products
    const products = await databaseService.getActiveProducts();
    console.log(`📊 Found ${products.length} active products to measure`);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active products to measure',
        results: []
      });
    }
    
    // Return response immediately
    console.log(`🚀 [Job ${jobId}] Starting background processing for ${products.length} products`);
    
    // Start background processing (don't wait for completion)
    processMeasurements(products, databaseService, jobId).catch(error => {
      console.error(`❌ [Job ${jobId}] Unhandled background error:`, error);
    });
    
    // Return response immediately
    return NextResponse.json({
      success: true,
      message: `Started processing ${products.length} products in background`,
      jobId,
      status: 'PROCESSING',
      startedAt: new Date().toISOString(),
      totalProducts: products.length
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing cron job status
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const databaseService = getDatabaseService();
    
    // Check database connection status and try to reconnect if needed
    let connectionStatus = databaseService.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      console.log('⚠️ Database not connected, attempting to reconnect...');
      
      // Try to reconnect
      const reconnected = await databaseService.reconnect();
      connectionStatus = databaseService.getConnectionStatus();
      
      if (!reconnected) {
        return NextResponse.json({
          success: false,
          error: `Database connection issue: ${connectionStatus.error || 'Unknown error'}`,
          status: 'Database not connected after reconnection attempt'
        }, { status: 500 });
      }
      
      console.log('✅ Database reconnected successfully');
    }
    
    // Get last run information
    const lastRun = await databaseService.getConfig('last_cron_run');
    const lastResults = await databaseService.getConfig('last_cron_results');
    
    return NextResponse.json({
      success: true,
      lastRun: lastRun ? new Date(lastRun) : null,
      lastResults: lastResults ? JSON.parse(lastResults) : null,
      status: 'Cron job endpoint is active'
    });

  } catch (error) {
    console.error('Error checking cron status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}