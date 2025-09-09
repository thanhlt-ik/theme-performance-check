import { getDatabaseService } from './database';
import { PageSpeedService } from './pagespeed';

export interface CronJobResult {
  product: string;
  deviceType: 'DESKTOP' | 'MOBILE';
  success: boolean;
  score?: number;
  measurementId?: string;
  error?: string;
  duration?: number;
}

export interface CronJobSummary {
  totalProducts: number;
  totalMeasurements: number;
  successCount: number;
  failureCount: number;
  duration: number;
  timestamp: string;
}

export class CronJobService {
  private databaseService = getDatabaseService();
  private pageSpeedService = new PageSpeedService();

  async runScheduledMeasurements(): Promise<{
    results: CronJobResult[];
    summary: CronJobSummary;
  }> {
    console.log('🕐 Starting scheduled performance measurements...');
    const startTime = Date.now();

    const products = await this.databaseService.getActiveProducts();
    console.log(`📊 Found ${products.length} active products to measure`);

    const results: CronJobResult[] = [];
    const deviceTypes: ('DESKTOP' | 'MOBILE')[] = ['DESKTOP', 'MOBILE'];

    // Process each product
    for (const product of products) {
      console.log(`🔍 Processing ${product.name}...`);

      for (const deviceType of deviceTypes) {
        const measurementStart = Date.now();
        
        try {
          // Rate limiting delay
          if (results.length > 0) {
            await this.delay(3000); // 3 second delay between measurements
          }

          const measurement = await this.pageSpeedService.measurePerformance(
            product.url,
            deviceType
          );

          // Save to database
          const savedMeasurement = await this.databaseService.createMeasurement({
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

          const duration = Date.now() - measurementStart;

          results.push({
            product: product.name,
            deviceType,
            success: true,
            score: measurement.performanceScore,
            measurementId: savedMeasurement.id,
            duration
          });

          console.log(`✅ ${product.name} (${deviceType}): Score ${measurement.performanceScore} (${duration}ms)`);

        } catch (error) {
          const duration = Date.now() - measurementStart;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          console.error(`❌ Failed to measure ${product.name} (${deviceType}): ${errorMessage}`);
          
          results.push({
            product: product.name,
            deviceType,
            success: false,
            error: errorMessage,
            duration
          });
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    const summary: CronJobSummary = {
      totalProducts: products.length,
      totalMeasurements: results.length,
      successCount,
      failureCount,
      duration: totalDuration,
      timestamp: new Date().toISOString()
    };

    // Save summary to database
    try {
      await this.databaseService.setConfig('last_cron_run', summary.timestamp);
      await this.databaseService.setConfig('last_cron_summary', JSON.stringify(summary));
    } catch (configError) {
      console.warn('Failed to save cron summary:', configError);
    }

    console.log(`🎉 Scheduled measurements completed in ${Math.round(totalDuration / 1000)}s`);
    console.log(`📈 Success: ${successCount}, Failed: ${failureCount}`);

    return { results, summary };
  }

  async getLastRunSummary(): Promise<CronJobSummary | null> {
    try {
      const summaryJson = await this.databaseService.getConfig('last_cron_summary');
      return summaryJson ? JSON.parse(summaryJson) : null;
    } catch (error) {
      console.error('Error getting last run summary:', error);
      return null;
    }
  }

  async getLastRunTime(): Promise<Date | null> {
    try {
      const lastRun = await this.databaseService.getConfig('last_cron_run');
      return lastRun ? new Date(lastRun) : null;
    } catch (error) {
      console.error('Error getting last run time:', error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate next run time based on schedule
  getNextRunTime(schedule: 'daily' | 'weekly' | 'monthly' = 'daily'): Date {
    const now = new Date();
    const next = new Date();

    switch (schedule) {
      case 'daily':
        // Next day at 2 AM
        next.setDate(now.getDate() + 1);
        next.setHours(2, 0, 0, 0);
        break;
      case 'weekly':
        // Next Monday at 2 AM
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        next.setDate(now.getDate() + daysUntilMonday);
        next.setHours(2, 0, 0, 0);
        break;
      case 'monthly':
        // First day of next month at 2 AM
        next.setMonth(now.getMonth() + 1, 1);
        next.setHours(2, 0, 0, 0);
        break;
    }

    return next;
  }
}

// Singleton instance
let cronJobService: CronJobService | null = null;

export function getCronJobService(): CronJobService {
  if (!cronJobService) {
    cronJobService = new CronJobService();
  }
  return cronJobService;
}
