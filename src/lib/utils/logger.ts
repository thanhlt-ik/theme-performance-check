/**
 * Configurable logging system with different levels
 * Replacement for console.log to have better control in production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Default configuration: show all logs in development, only warnings and errors in production
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;

// Allow override through environment variable
const CURRENT_LOG_LEVEL = Number(process.env.LOG_LEVEL) || DEFAULT_LOG_LEVEL;

// Colors for console output
const COLORS = {
  debug: '\x1b[34m', // Blue
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m'   // Reset
};

/**
 * Logger utility with different levels and consistent formatting
 */
export const logger = {
  /**
   * Log debug message - only shown in development or when configured
   * @param message - Message to log
   * @param args - Additional parameters (objects, errors, etc.)
   */
  debug: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      const timestamp = new Date().toISOString();
      console.log(`${COLORS.debug}[DEBUG]${COLORS.reset} ${timestamp} - ${message}`, ...args);
    }
  },

  /**
   * Log general information - usually shown in development and staging
   * @param message - Message to log
   * @param args - Additional parameters
   */
  info: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      const timestamp = new Date().toISOString();
      console.log(`${COLORS.info}[INFO]${COLORS.reset} ${timestamp} - ${message}`, ...args);
    }
  },

  /**
   * Log warning - always shown unless logs are completely disabled
   * @param message - Message to log
   * @param args - Additional parameters
   */
  warn: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      const timestamp = new Date().toISOString();
      console.warn(`${COLORS.warn}[WARN]${COLORS.reset} ${timestamp} - ${message}`, ...args);
    }
  },

  /**
   * Log error - always shown unless logs are completely disabled
   * @param message - Message to log
   * @param args - Additional parameters (usually Error object)
   */
  error: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      const timestamp = new Date().toISOString();
      console.error(`${COLORS.error}[ERROR]${COLORS.reset} ${timestamp} - ${message}`, ...args);
    }
  },

  /**
   * Create a logger with fixed prefix for specific module
   * @param module - Module name
   * @returns Logger instance with pre-configured prefix
   */
  createModuleLogger: (module: string) => {
    return {
      debug: (message: string, ...args: any[]) => 
        logger.debug(`[${module}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => 
        logger.info(`[${module}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => 
        logger.warn(`[${module}] ${message}`, ...args),
      error: (message: string, ...args: any[]) => 
        logger.error(`[${module}] ${message}`, ...args)
    };
  }
};

// Usage example:
// const moduleLogger = logger.createModuleLogger('PageSpeedService');
// moduleLogger.info('Service initialized');

