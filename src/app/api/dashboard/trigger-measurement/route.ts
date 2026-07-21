import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { triggerMeasurementJob } from '@/lib/services/measurement-job';

// Same-origin trigger used by the dashboard's "Test Run" button. Requires no
// secret — this app has no login/session system, so every other write
// endpoint (e.g. POST /api/measurements) is already reachable the same way.
// This route exists so the dashboard no longer has to ship CRON_SECRET into
// client JS just to call the externally-facing, secret-gated cron webhook.
export async function POST() {
  try {
    const databaseService = getDatabaseService();
    const result = await triggerMeasurementJob(databaseService);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Failed to trigger measurement job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
