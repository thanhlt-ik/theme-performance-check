import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';

export async function GET() {
  try {
    const db = getDatabaseService();
    
    // Get basic dashboard data
    const [products, stats] = await Promise.all([
      db.getActiveProducts(),
      db.getMeasurementStats()
    ]);

    // Get recent measurements for trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMeasurements = await db.getMeasurements({
      dateRange: {
        from: thirtyDaysAgo,
        to: new Date()
      },
      limit: 100
    });

    // Calculate performance trends
    const performanceTrends = products.map(product => {
      const productMeasurements = recentMeasurements.filter(m => m.productId === product.id);
      
      const desktopMeasurements = productMeasurements.filter(m => m.deviceType === 'DESKTOP');
      const mobileMeasurements = productMeasurements.filter(m => m.deviceType === 'MOBILE');
      
      const avgDesktop = desktopMeasurements.length > 0 
        ? Math.round(desktopMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / desktopMeasurements.length)
        : 0;
        
      const avgMobile = mobileMeasurements.length > 0
        ? Math.round(mobileMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / mobileMeasurements.length)
        : 0;

      return {
        productId: product.id,
        productName: product.name,
        desktop: avgDesktop,
        mobile: avgMobile,
        measurementCount: productMeasurements.length
      };
    });

    // Calculate overall averages
    const overallDesktop = performanceTrends.length > 0
      ? Math.round(performanceTrends.reduce((sum, p) => sum + p.desktop, 0) / performanceTrends.length)
      : stats.averageScores?.desktop || 0;
      
    const overallMobile = performanceTrends.length > 0
      ? Math.round(performanceTrends.reduce((sum, p) => sum + p.mobile, 0) / performanceTrends.length)
      : stats.averageScores?.mobile || 0;

    const dashboardData = {
      summary: {
        totalProducts: products.length,
        totalMeasurements: stats.total || 0,
        averageDesktop: overallDesktop,
        averageMobile: overallMobile
      },
      performanceTrends,
      recentMeasurements: recentMeasurements.slice(0, 10), // Latest 10 measurements
      products
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: errorMessage
    }, { status: 500 });
  }
}
