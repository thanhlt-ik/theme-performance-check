/**
 * Service for handling authentication and authorization
 * Provides functions to create and verify tokens
 */
import { logger } from '../utils/logger';

// Logger for this module
const authLogger = logger.createModuleLogger('AuthService');

/**
 * Class for handling authentication and authorization
 */
export class AuthService {
  private cronSecret: string;

  constructor() {
    this.cronSecret = process.env.CRON_SECRET || '';
    
    if (!this.cronSecret) {
      authLogger.warn('CRON_SECRET not configured, authentication will fail');
    }
  }

  /**
   * Verify token for cron job
   * @param token - Token to verify
   * @returns true if token is valid, false otherwise
   */
  verifyCronToken(token: string): boolean {
    if (!this.cronSecret) {
      authLogger.error('CRON_SECRET not configured');
      return false;
    }

    return token === this.cronSecret;
  }

  /**
   * Create temporary token for frontend with short expiration
   * @param expiresInSeconds - Expiration time in seconds (default 5 minutes)
   * @returns Temporary token
   */
  createTemporaryToken(expiresInSeconds: number = 300): string {
    // In practice, you should use a library like jsonwebtoken
    // to create JWT token with expiration
    
    // This is a simple way to create temporary token
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = {
      exp: expiresAt,
      type: 'temporary',
      // Add other information if needed
    };
    
    // In practice, you should sign this payload with a secret key
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    return token;
  }

  /**
   * Verify temporary token
   * @param token - Token to verify
   * @returns true if token is valid and not expired, false otherwise
   */
  verifyTemporaryToken(token: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check expiration
      if (payload.exp && payload.exp > Date.now()) {
        return true;
      }
      
      authLogger.warn('Token expired');
      return false;
    } catch (error) {
      authLogger.error('Invalid token format', error);
      return false;
    }
  }
}

// Singleton instance
let authService: AuthService | null = null;

/**
 * Get AuthService instance
 * @returns AuthService instance
 */
export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

