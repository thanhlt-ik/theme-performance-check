import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { getJobHistory } from '@/lib/services/measurement-job';

// Lists past batch measurement jobs (most recent first) for the Scheduled
// Jobs page's history table.
// Neon's free-tier compute can take a few seconds to wake from suspend; give this
// route more room than Vercel's 10s Hobby default so a cold-start retry can finish
// instead of being hard-killed mid-attempt.
export const maxDuration = 45;

export async function GET() {
  try {
    const databaseService = getDatabaseService();
    const jobs = await getJobHistory(databaseService);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
