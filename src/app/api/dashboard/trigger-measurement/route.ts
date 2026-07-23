import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { runMeasurementCycle } from '@/lib/services/measurement-job';

// Same-origin trigger used by the dashboard's "Test Run" button. Requires no
// secret — this app has no login/session system, so every other write
// endpoint (e.g. POST /api/measurements) is already reachable the same way.
// This route exists so the dashboard no longer has to ship CRON_SECRET into
// client JS just to call the externally-facing, secret-gated cron webhook.
// Called once when "Test Run" is clicked, and then repeatedly by the
// dashboard's job progress panel while a job is in view — each call
// advances one product's worth of measurements. forceNewRun bypasses the
// "already ran today" guard the external cron respects, since a human
// clicking Test Run means it, but only takes effect when nothing is
// already in progress (it never starts a second job alongside one that's
// already running).
export const maxDuration = 60;

export async function POST() {
  try {
    const databaseService = getDatabaseService();
    const result = await runMeasurementCycle(databaseService, { forceNewRun: true });
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
