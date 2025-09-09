import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';

export async function GET() {
  try {
    const databaseService = getDatabaseService();
    const connectionStatus = databaseService.getConnectionStatus();
    const healthCheck = await databaseService.healthCheck();
    
    if (!connectionStatus.isConnected) {
      return NextResponse.json({
        success: false,
        status: 'Database connection failed',
        error: connectionStatus.error,
        details: {
          isConnected: false,
          healthCheck: false,
          timestamp: new Date().toISOString()
        }
      }, { status: 503 }); // Service Unavailable
    }

    // Get basic stats to verify database is working
    const [totalProducts, totalMeasurements] = await Promise.all([
      databaseService.getProducts().then(products => products.length),
      databaseService.getTotalMeasurements()
    ]);

    return NextResponse.json({
      success: true,
      status: 'Database connected and operational',
      details: {
        isConnected: connectionStatus.isConnected,
        healthCheck,
        totalProducts,
        totalMeasurements,
        databaseType: 'SQLite',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      status: 'Database operation failed',
      error: errorMessage,
      details: {
        isConnected: false,
        healthCheck: false,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
