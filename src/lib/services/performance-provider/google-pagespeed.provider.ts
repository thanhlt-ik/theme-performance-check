/**
 * Implementation of PerformanceProvider using Google PageSpeed Insights API
 */
import { DeviceType } from '@prisma/client';
import { PerformanceProvider } from './performance-provider.interface';
import { PageSpeedInsightsResponse, PerformanceMetrics } from '@/lib/types';
import { PAGESPEED_CONFIG } from '@/lib/utils/constants';
import { logger } from '@/lib/utils/logger';

// Logger for this module
const pageSpeedLogger = logger.createModuleLogger('GooglePageSpeedProvider');

/**
 * Provider using Google PageSpeed Insights API
 */
export class GooglePageSpeedProvider implements PerformanceProvider {
  readonly name = 'Google PageSpeed Insights';
  
  private apiKey: string;
  private baseUrl: string;
  private rateLimitDelay: number;
  private maxRetries: number;
  private lastRequestTime: number;

  /**
   * Initialize GooglePageSpeedProvider
   * @param apiKey - API key for Google PageSpeed Insights (optional, will get from env if not provided)
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PAGESPEED_API_KEY || '';
    this.baseUrl = PAGESPEED_CONFIG.BASE_URL;
    this.rateLimitDelay = PAGESPEED_CONFIG.RATE_LIMIT_DELAY;
    this.maxRetries = PAGESPEED_CONFIG.MAX_RETRIES;
    this.lastRequestTime = 0;
    
    if (!this.apiKey) {
      pageSpeedLogger.warn('Google PageSpeed API key is not provided');
    }
  }

  /**
   * Check if provider is ready to use
   * @returns true if API key is configured, false otherwise
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Measure performance for a URL
   * @param url - URL to measure
   * @param deviceType - Device type (desktop/mobile)
   * @returns Promise with measurement results
   */
  async measurePerformance(
    url: string, 
    deviceType: DeviceType = DeviceType.DESKTOP
  ): Promise<PerformanceMetrics> {
    // Validate URL first
    if (!GooglePageSpeedProvider.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const strategy = deviceType === DeviceType.DESKTOP ? 'desktop' : 'mobile';
    
    // Rate limiting: ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      pageSpeedLogger.debug(`Rate limiting: waiting ${waitTime}ms before next request`);
      await this.sleep(waitTime);
    }
    
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        this.lastRequestTime = Date.now();
        pageSpeedLogger.info(`Measuring ${url} (${strategy}) - attempt ${attempts + 1}`);
        
        const response = await this.makeRequest(url, strategy);
        const result = this.transformResponse(response, deviceType);
        
        pageSpeedLogger.info(`Measurement successful: ${result.performanceScore} score`);
        return result;
        
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        pageSpeedLogger.warn(`Attempt ${attempts} failed: ${errorMessage}`);
        
        if (attempts >= this.maxRetries) {
          // Check if it's a rate limit error
          if (GooglePageSpeedProvider.isRateLimitError(error instanceof Error ? error : new Error(errorMessage))) {
            throw new Error(`Google PageSpeed API rate limit reached. Please wait a few minutes before trying again.`);
          }
          throw new Error(`Failed to measure performance after ${this.maxRetries} attempts: ${errorMessage}`);
        }
        
        // Improved backoff mechanism for rate limit errors
        const isRateLimit = errorMessage.includes('Unable to process request') || 
                           errorMessage.includes('rate') || 
                           errorMessage.includes('quota') ||
                           errorMessage.includes('too many requests');
                           
        // Wait time increases progressively with retry count and longer for rate limit errors
        const baseDelay = isRateLimit ? 30000 : this.rateLimitDelay;
        const delay = baseDelay * Math.pow(2, attempts);
        
        // Add some randomness to avoid concurrent requests
        const jitter = Math.floor(Math.random() * 3000);
        const finalDelay = delay + jitter;
        
        pageSpeedLogger.debug(`Waiting ${Math.round(finalDelay/1000)}s before retry ${attempts+1}/${this.maxRetries} (${isRateLimit ? 'rate limit detected' : 'normal retry'})...`);
        await this.sleep(finalDelay);
      }
    }
    
    throw new Error('Unexpected error in measurePerformance');
  }

  /**
   * Measure performance for a URL on both desktop and mobile
   * @param url - URL to measure
   * @returns Promise with measurement results for both desktop and mobile
   */
  async measureBothDevices(url: string): Promise<{
    desktop: PerformanceMetrics;
    mobile: PerformanceMetrics;
  }> {
    // Sequential requests to avoid rate limiting
    pageSpeedLogger.info('Measuring desktop first, then mobile...');
    const desktop = await this.measurePerformance(url, DeviceType.DESKTOP);
    
    // Wait between desktop and mobile measurements
    await this.sleep(this.rateLimitDelay);
    
    const mobile = await this.measurePerformance(url, DeviceType.MOBILE);

    return { desktop, mobile };
  }

  /**
   * Get information about provider quota/limits
   * @returns Information about remaining quota and reset time
   */
  async getQuotaInfo(): Promise<{
    remainingQuota?: number;
    resetTime?: Date;
  }> {
    // Google PageSpeed Insights API does not provide quota information
    return {};
  }

  /**
   * Send request to Google PageSpeed Insights API
   * @param url - URL to measure
   * @param strategy - Measurement strategy (desktop/mobile)
   * @returns Response from API
   */
  private async makeRequest(url: string, strategy: 'desktop' | 'mobile'): Promise<PageSpeedInsightsResponse> {
    const params = new URLSearchParams({
      url: url,
      key: this.apiKey,
      strategy,
      category: 'performance',
      locale: 'en'
    });

    const requestUrl = `${this.baseUrl}?${params.toString()}`;
    pageSpeedLogger.debug(`Making API request: ${url} (${strategy})`);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': PAGESPEED_CONFIG.USER_AGENT
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Use default error message if parsing fails
      }

      throw new Error(errorMessage);
    }

    const data: PageSpeedInsightsResponse = await response.json();
    
    if (!data.lighthouseResult) {
      throw new Error('Invalid response: missing lighthouse results');
    }

    return data;
  }

  /**
   * Convert API response to PerformanceMetrics
   * @param response - Response from API
   * @param deviceType - Device type
   * @returns PerformanceMetrics
   */
  private transformResponse(
    response: PageSpeedInsightsResponse, 
    deviceType: DeviceType
  ): PerformanceMetrics {
    const lighthouse = response.lighthouseResult;
    const audits = lighthouse.audits;
    
    // Performance score (0-100)
    const performanceScore = Math.round((lighthouse.categories.performance.score || 0) * 100);
    
    // Core Web Vitals and other metrics
    const fcp = this.getMetricValue(audits['first-contentful-paint']);
    const lcp = this.getMetricValue(audits['largest-contentful-paint']);
    const cls = this.getMetricValue(audits['cumulative-layout-shift']);
    const fid = this.getMetricValue(audits['first-input-delay']) || 
                this.getMetricValue(audits['max-potential-fid']);
    const ttfb = this.getMetricValue(audits['server-response-time']);
    const speedIndex = this.getMetricValue(audits['speed-index']);
    const tbt = this.getMetricValue(audits['total-blocking-time']);

    // Debug CLS value extraction
    pageSpeedLogger.debug('CLS Debug:', {
      rawValue: audits['cumulative-layout-shift']?.numericValue,
      processedValue: cls,
      auditExists: !!audits['cumulative-layout-shift']
    });

    return {
      performanceScore,
      fcp,
      lcp, 
      cls,
      fid,
      ttfb,
      speedIndex,
      tbt,
      measurementDate: new Date(response.analysisUTCTimestamp),
      deviceType
    };
  }

  /**
   * Extract numeric value from audit
   * @param audit - Audit from API
   * @returns Numeric value or null if not available
   */
  private getMetricValue(audit: any): number | null {
    if (!audit || audit.numericValue === undefined) {
      return null;
    }
    
    // Convert to appropriate units
    const value = audit.numericValue;
    const unit = audit.numericUnit;
    
    // Convert seconds to milliseconds for time-based metrics
    if (unit === 'second') {
      return Math.round(value * 1000);
    }
    
    // For CLS (unitless), preserve decimal precision
    if (audit.id === 'cumulative-layout-shift') {
      return Number(value.toFixed(3)); // Keep 3 decimal places for CLS
    }
    
    return Math.round(value);
  }

  /**
   * Utility to sleep for a period of time
   * @param ms - Time to sleep (milliseconds)
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a URL is valid
   * @param url - URL to check
   * @returns true if URL is valid, false otherwise
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if an error is a rate limit error
   * @param error - Error object
   * @returns true if it's a rate limit error, false otherwise
   */
  static isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('unable to process request') ||
           message.includes('rate') ||
           message.includes('quota') ||
           message.includes('too many requests') ||
           message.includes('wait a while');
  }
}

