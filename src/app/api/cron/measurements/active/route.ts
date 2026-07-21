import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';

// Lets the dashboard discover an in-flight batch measurement job without
// already knowing its jobId — used to restore the progress panel after a
// page reload while a job is still running.
export async function GET() {
  try {
    const databaseService = getDatabaseService();
    const jobId = await databaseService.getConfig('active_job_id');

    if (!jobId) {
      return NextResponse.json({ success: true, jobId: null });
    }

    const raw = await databaseService.getConfig(`job_progress:${jobId}`);
    return NextResponse.json({
      success: true,
      jobId,
      progress: raw ? JSON.parse(raw) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
