import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';
import { getJobHistory } from '@/lib/services/measurement-job';

// Lists past batch measurement jobs (most recent first) for the Scheduled
// Jobs page's history table.
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
