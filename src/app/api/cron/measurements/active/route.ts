import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { getJobProgress } from '@/lib/services/measurement-job';

// Lets the dashboard discover an in-flight batch measurement job without
// already knowing its jobId — used to restore the progress panel after a
// page reload while a job is still running.
// Neon's free-tier compute can take a few seconds to wake from suspend; give this
// route more room than Vercel's 10s Hobby default so a cold-start retry can finish
// instead of being hard-killed mid-attempt.
export const maxDuration = 45;

export async function GET() {
  try {
    const databaseService = getDatabaseService();
    const jobId = await databaseService.getConfig('active_job_id');

    if (!jobId) {
      return NextResponse.json({ success: true, jobId: null });
    }

    const progress = await getJobProgress(databaseService, jobId);
    return NextResponse.json({ success: true, jobId, progress });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
