import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { triggerMeasurementJob } from '@/lib/services/measurement-job';

// Verify cron secret to prevent unauthorized access. This route is the
// externally-reachable webhook (e.g. cron-job.org) — it stays secret-gated.
// The dashboard's own "Test Run" button uses /api/dashboard/trigger-measurement
// instead, so no cron secret ever needs to ship to the browser.
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

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Starting automated performance measurements...');
    const databaseService = getDatabaseService();
    const result = await triggerMeasurementJob(databaseService);

    return NextResponse.json(result);
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

// Read-only status check — no secret required, same trust level as the
// dashboard's other read endpoints (/api/products, /api/measurements).
export async function GET() {
  try {
    const databaseService = getDatabaseService();

    let connectionStatus = databaseService.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      console.log('⚠️ Database not connected, attempting to reconnect...');

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
