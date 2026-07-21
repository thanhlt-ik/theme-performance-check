import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/database';

// Returns the live progress snapshot for a batch measurement job, polled by
// the dashboard's job progress panel. Read-only and unauthenticated, in line
// with the other read endpoints (/api/products, /api/measurements).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const databaseService = getDatabaseService();
    const raw = await databaseService.getConfig(`job_progress:${jobId}`);

    if (!raw) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, progress: JSON.parse(raw) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
