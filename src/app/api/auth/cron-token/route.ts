/**
 * API endpoint to get temporary token for cron job
 * Used by frontend to get token for manual operations
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/services/auth';
import { logger } from '@/lib/utils/logger';

// Logger for this endpoint
const apiLogger = logger.createModuleLogger('API:CronToken');

/**
 * GET endpoint to get temporary token
 * This token is only valid for a short time (5 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    // In practice, you should add user authentication here
    // to ensure only logged-in users can get token
    
    // Create temporary token
    const authService = getAuthService();
    const token = authService.createTemporaryToken();
    
    apiLogger.info('Temporary cron token created');
    
    return NextResponse.json({
      success: true,
      token,
      expiresIn: 300 // 5 minutes
    });
  } catch (error) {
    apiLogger.error('Error creating temporary token', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create token'
      },
      { status: 500 }
    );
  }
}

