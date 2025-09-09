/**
 * Entry point for performance providers
 * Export providers and factory function
 */
import { PerformanceProvider, PerformanceProviderType } from './performance-provider.interface';
import { GooglePageSpeedProvider } from './google-pagespeed.provider';
import { logger } from '@/lib/utils/logger';

// Logger for this module
const providerLogger = logger.createModuleLogger('PerformanceProviders');

// Singleton instances
let googlePageSpeedProvider: GooglePageSpeedProvider | null = null;

/**
 * Factory function to create provider instance based on type
 * @param type - Type of provider to create
 * @returns Provider instance
 */
export function createPerformanceProvider(type: PerformanceProviderType): PerformanceProvider {
  switch (type) {
    case PerformanceProviderType.GOOGLE_PAGESPEED:
      if (!googlePageSpeedProvider) {
        googlePageSpeedProvider = new GooglePageSpeedProvider();
      }
      return googlePageSpeedProvider;
    
    // Add other providers here when needed
    
    default:
      providerLogger.error(`Unknown provider type: ${type}`);
      throw new Error(`Provider type ${type} is not implemented yet`);
  }
}

/**
 * Get default provider based on configuration
 * @returns Default provider
 */
export function getDefaultProvider(): PerformanceProvider {
  // Default to Google PageSpeed
  return createPerformanceProvider(PerformanceProviderType.GOOGLE_PAGESPEED);
}

// Re-export
export * from './performance-provider.interface';
export * from './google-pagespeed.provider';

