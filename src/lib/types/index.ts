import { DeviceType, JobStatus, Prisma } from '@prisma/client';

// Re-export Prisma enums
export { DeviceType, JobStatus };

// Database model types (extending Prisma types)
export interface Product {
  id: string;
  name: string;
  url: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceMeasurement {
  id: string;
  productId: string;
  deviceType: DeviceType;
  measurementDate: Date;
  performanceScore: number;
  fcp: number | null; // First Contentful Paint (ms)
  lcp: number | null; // Largest Contentful Paint (ms)
  cls: number | null; // Cumulative Layout Shift
  fid: number | null; // First Input Delay (ms)
  ttfb: number | null; // Time to First Byte (ms)
  speedIndex: number | null;
  tbt: number | null; // Total Blocking Time (ms)
  opportunity: Prisma.JsonValue | null; // Performance opportunities
  diagnostics: Prisma.JsonValue | null; // Diagnostic information
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

export interface MeasurementJob {
  id: string;
  productId: string;
  deviceType: DeviceType;
  status: JobStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Google PageSpeed Insights API types
export interface PageSpeedInsightsResponse {
  kind: string;
  id: string;
  loadingExperience?: {
    id: string;
    metrics: Record<string, any>;
    overall_category: string;
    initial_url: string;
  };
  lighthouseResult: {
    requestedUrl: string;
    finalUrl: string;
    lighthouseVersion: string;
    userAgent: string;
    fetchTime: string;
    environment: {
      networkUserAgent: string;
      hostUserAgent: string;
      benchmarkIndex: number;
    };
    runWarnings: string[];
    configSettings: Record<string, any>;
    categories: {
      performance: {
        id: string;
        title: string;
        score: number;
        auditRefs: Array<{
          id: string;
          weight: number;
          group?: string;
        }>;
      };
    };
    audits: {
      'first-contentful-paint': PageSpeedAudit;
      'largest-contentful-paint': PageSpeedAudit;
      'cumulative-layout-shift': PageSpeedAudit;
      'first-input-delay'?: PageSpeedAudit;
      'max-potential-fid'?: PageSpeedAudit;
      'total-blocking-time': PageSpeedAudit;
      'speed-index': PageSpeedAudit;
      'server-response-time': PageSpeedAudit;
      [key: string]: PageSpeedAudit | undefined;
    };
    timing: {
      total: number;
    };
  };
  analysisUTCTimestamp: string;
}

export interface PageSpeedAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  explanation?: string;
  details?: Record<string, any>;
}

// Configuration types
export interface ProductConfig {
  name: string;
  url: string;
  description?: string;
}

export interface ProductsConfig {
  products: ProductConfig[];
}

// Dashboard types
export interface PerformanceMetrics {
  performanceScore: number;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  fid: number | null;
  ttfb: number | null;
  speedIndex: number | null;
  tbt: number | null;
  measurementDate: Date;
  deviceType: DeviceType;
}

export interface ProductPerformanceData {
  product: Product;
  latestDesktop?: PerformanceMetrics;
  latestMobile?: PerformanceMetrics;
  measurements: PerformanceMeasurement[];
  averageScore: {
    desktop: number;
    mobile: number;
  };
}

export interface DashboardData {
  products: ProductPerformanceData[];
  totalMeasurements: number;
  lastUpdated: Date;
}

// API Request/Response types
export interface MeasurementRequest {
  productId: string;
  deviceType?: DeviceType;
}

export interface MeasurementResponse {
  success: boolean;
  data?: PerformanceMeasurement;
  error?: string;
}

export interface ExportRequest {
  productIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  deviceTypes?: DeviceType[];
  format: 'csv' | 'json';
}

export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

// Chart data types
export interface ChartDataPoint {
  date: string;
  performanceScore: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  deviceType: DeviceType;
}

export interface ProductChartData {
  productId: string;
  productName: string;
  data: ChartDataPoint[];
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

// Utility types
export type DateRange = {
  from: Date;
  to: Date;
};

export type SortOrder = 'asc' | 'desc';
export type SortField = 'date' | 'score' | 'name';
