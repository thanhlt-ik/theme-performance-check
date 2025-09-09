/**
 * Constants and configurations used throughout the application
 * Centralize fixed values for easy management and modification
 */

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  MEASUREMENTS: '/api/measurements',
  CRON_MEASUREMENTS: '/api/cron/measurements',
  PRODUCTS: '/api/products',
  EXPORT: '/api/export',
  DASHBOARD: '/api/dashboard',
  HEALTH: '/api/health'
};

/**
 * Application routes
 */
export const APP_ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/dashboard/products',
  EXPORT: '/dashboard/export',
  SETTINGS: '/dashboard/settings'
};

/**
 * General configuration values
 */
export const APP_CONFIG = {
  APP_NAME: 'Shopify Performance Monitor',
  VERSION: '1.0.0',
  DEFAULT_BATCH_SIZE: 3,
  DEFAULT_RATE_LIMIT_DELAY: 10000, // 10 seconds
  DEFAULT_MAX_RETRIES: 3
};

/**
 * API keys and secrets related values
 * Note: Don't hardcode sensitive values here
 * Use process.env to get from environment variables
 */
export const API_KEYS = {
  // Use environment variable for CRON_SECRET instead of hardcoding
  getCronSecret: () => process.env.CRON_SECRET || '',
  
  // Generate temporary token for frontend with short expiration
  getTemporaryCronToken: async () => {
    // In practice, this would be an API call to get temporary token
    // with short expiration from server
    return process.env.NEXT_PUBLIC_TEMPORARY_CRON_TOKEN || '';
  }
};

/**
 * Database related values
 */
export const DATABASE_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CONNECTION_RETRY_ATTEMPTS: 3,
  CONNECTION_RETRY_DELAY: 2000 // 2 seconds
};

/**
 * PageSpeed API related values
 */
export const PAGESPEED_CONFIG = {
  BASE_URL: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
  RATE_LIMIT_DELAY: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 5000, // 5 seconds
  USER_AGENT: 'Shopify-Performance-Monitor/1.0'
};

