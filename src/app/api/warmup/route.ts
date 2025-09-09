import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';

// API route to warm up database connections
export async function GET() {
  try {
    console.log('🔥 Warming up PostgreSQL database connection...');
    
    const db = getDatabaseService();
    
    // Check initial connection status
    const initialStatus = db.getConnectionStatus();
    console.log('📊 Initial connection status:', initialStatus);
    
    // Force reconnection to wake up Neon database
    if (!initialStatus.isConnected) {
      console.log('🔄 Connection not active, attempting reconnection...');
      const reconnectSuccess = await db.reconnect();
      
      if (!reconnectSuccess) {
        throw new Error('Failed to establish database connection during warmup');
      }
    }
    
    // Perform multiple operations to fully wake up the database
    console.log('⏳ Performing database operations to ensure full activation...');
    
    const [products, healthCheck] = await Promise.all([
      db.getProducts().catch(err => {
        console.warn('Products query failed during warmup:', err.message);
        return [];
      }),
      db.healthCheck().catch(err => {
        console.warn('Health check failed during warmup:', err.message);
        return false;
      })
    ]);
    
    const finalStatus = db.getConnectionStatus();
    
    console.log(`✅ PostgreSQL database warmup completed. Found ${products.length} products.`);
    
    return NextResponse.json({
      success: true,
      message: 'PostgreSQL database warmed up successfully',
      data: {
        isConnected: finalStatus.isConnected,
        productCount: products.length,
        healthCheckPassed: healthCheck,
        connectionError: finalStatus.error,
        timestamp: new Date().toISOString(),
        databaseType: 'PostgreSQL',
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('❌ PostgreSQL database warmup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database warmup failed',
      details: {
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        timestamp: new Date().toISOString(),
        databaseType: 'PostgreSQL',
        environment: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
