/**
 * Interface for performance data providers
 * Defines a common contract for all providers
 */
import { DeviceType } from '@prisma/client';
import { PerformanceMetrics } from '@/lib/types';

/**
 * Interface for performance data providers
 * Providers like Google PageSpeed, Lighthouse, etc. will implement this interface
 */
export interface PerformanceProvider {
  /**
   * Provider name
   */
  readonly name: string;
  
  /**
   * Measure performance for a URL
   * @param url - URL to measure
   * @param deviceType - Device type (desktop/mobile)
   * @returns Promise with measurement results
   */
  measurePerformance(url: string, deviceType: DeviceType): Promise<PerformanceMetrics>;
  
  /**
   * Measure performance for a URL on both desktop and mobile
   * @param url - URL to measure
   * @returns Promise with measurement results for both desktop and mobile
   */
  measureBothDevices(url: string): Promise<{
    desktop: PerformanceMetrics;
    mobile: PerformanceMetrics;
  }>;
  
  /**
   * Check if provider is ready to use
   * @returns true if provider is ready, false otherwise
   */
  isAvailable(): boolean;
  
  /**
   * Get information about provider quota/limits
   * @returns Information about remaining quota and reset time
   */
  getQuotaInfo(): Promise<{
    remainingQuota?: number;
    resetTime?: Date;
  }>;
}

/**
 * Enum defining supported provider types
 */
export enum PerformanceProviderType {
  GOOGLE_PAGESPEED = 'google_pagespeed',
  LIGHTHOUSE = 'lighthouse'
}

/**
 * Factory function to create provider instance based on type
 * @param type - Type of provider to create
 * @returns Provider instance
 */
export function createPerformanceProvider(type: PerformanceProviderType): PerformanceProvider {
  // Will be implemented in other files
  throw new Error(`Provider type ${type} is not implemented yet`);
}

/**
 * Get default provider based on configuration
 * @returns Default provider
 */
export function getDefaultProvider(): PerformanceProvider {
  // Will be implemented in other files
  throw new Error('Default provider is not implemented yet');
}

