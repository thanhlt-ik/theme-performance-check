import { DeviceType } from '@prisma/client';
import { PageSpeedInsightsResponse, PerformanceMetrics } from '../types';

export class PageSpeedService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  private rateLimitDelay = 10000; // 10 seconds between requests (increased further)
  private maxRetries = 3; // Increased retries with better backoff strategy
  private lastRequestTime = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PAGESPEED_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google PageSpeed Insights API key is required');
    }
  }

  /**
   * Measure performance for a URL with rate limiting
   */
  async measurePerformance(
    url: string, 
    deviceType: DeviceType = DeviceType.DESKTOP
  ): Promise<PerformanceMetrics> {
    // Validate URL first
    if (!PageSpeedService.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const strategy = deviceType === DeviceType.DESKTOP ? 'desktop' : 'mobile';
    
    // Rate limiting: ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next request`);
      await this.sleep(waitTime);
    }
    
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        this.lastRequestTime = Date.now();
        console.log(`🔍 Measuring ${url} (${strategy}) - attempt ${attempts + 1}`);
        
        const response = await this.makeRequest(url, strategy);
        const result = this.transformResponse(response, deviceType);
        
        console.log(`✅ PageSpeed measurement successful: ${result.performanceScore} score`);
        return result;
        
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Attempt ${attempts} failed:`, errorMessage);
        
        if (attempts >= this.maxRetries) {
          // Check if it's a rate limit error
          if (errorMessage.includes('Unable to process request') || 
              errorMessage.includes('rate') || 
              errorMessage.includes('quota')) {
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
        // With rate limit: 30s -> 60s -> 120s
        // With other errors: 10s -> 20s -> 40s
        const baseDelay = isRateLimit ? 30000 : this.rateLimitDelay;
        const delay = baseDelay * Math.pow(2, attempts);
        
        // Add some randomness to avoid concurrent requests
        const jitter = Math.floor(Math.random() * 3000);
        const finalDelay = delay + jitter;
        
        console.log(`⏳ Waiting ${Math.round(finalDelay/1000)}s before retry ${attempts+1}/${this.maxRetries} (${isRateLimit ? 'rate limit detected' : 'normal retry'})...`);
        await this.sleep(finalDelay);
      }
    }
    
    throw new Error('Unexpected error in measurePerformance');
  }

  /**
   * Measure performance for both desktop and mobile (with sequential requests to avoid rate limits)
   */
  async measureBothDevices(url: string): Promise<{
    desktop: PerformanceMetrics;
    mobile: PerformanceMetrics;
  }> {
    // Sequential requests to avoid rate limiting
    console.log('📱 Measuring desktop first, then mobile...');
    const desktop = await this.measurePerformance(url, DeviceType.DESKTOP);
    
    // Wait between desktop and mobile measurements
    await this.sleep(this.rateLimitDelay);
    
    const mobile = await this.measurePerformance(url, DeviceType.MOBILE);

    return { desktop, mobile };
  }

  /**
   * Make API request to Google PageSpeed Insights
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
    console.log(`🌐 Making PageSpeed API request: ${url} (${strategy})`);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Shopify-Performance-Monitor/1.0'
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
   * Transform Google PageSpeed response to our performance metrics format
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
    console.log('🔍 CLS Debug:', {
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
   * Extract numeric value from PageSpeed audit
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
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate URL before making API request
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
   * Check if error is rate limit related
   */
  static isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('unable to process request') ||
           message.includes('rate') ||
           message.includes('quota') ||
           message.includes('too many requests') ||
           message.includes('wait a while');
  }

  /**
   * Get API usage information (if available)
   */
  async getApiQuota(): Promise<{
    remainingQuota?: number;
    resetTime?: Date;
  }> {
    // Note: Google PageSpeed Insights API doesn't provide quota information
    // This is a placeholder for potential future enhancement
    return {};
  }
}

// Singleton instance with request tracking
let pageSpeedService: PageSpeedService | null = null;
let globalLastRequest = 0;

export function getPageSpeedService(): PageSpeedService {
  if (!pageSpeedService) {
    pageSpeedService = new PageSpeedService();
  }
  return pageSpeedService;
}

// Export for testing
export function resetPageSpeedService(): void {
  pageSpeedService = null;
  globalLastRequest = 0;
}

// Global rate limiting across all instances
export function getTimeSinceLastRequest(): number {
  return Date.now() - globalLastRequest;
}

export function updateLastRequestTime(): void {
  globalLastRequest = Date.now();
}
