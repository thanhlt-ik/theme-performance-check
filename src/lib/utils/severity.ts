/**
 * Shared severity classification for performance scores and Core Web Vitals metrics.
 * Centralized so badges/cells/callouts across pages read the same thresholds and colors.
 */

export type Severity = 'good' | 'warn' | 'poor';

export function severityForScore(score: number | null | undefined): Severity {
  if (score === null || score === undefined) return 'poor';
  if (score >= 90) return 'good';
  if (score >= 50) return 'warn';
  return 'poor';
}

// Official web.dev thresholds per metric (ms unless noted).
const METRIC_THRESHOLDS: Record<string, { good: number; needsImprovement: number }> = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fid: { good: 100, needsImprovement: 300 },
  ttfb: { good: 800, needsImprovement: 1800 },
  tbt: { good: 200, needsImprovement: 600 },
  speedIndex: { good: 3400, needsImprovement: 5800 },
};

export function severityForMetric(metric: keyof typeof METRIC_THRESHOLDS, value: number | null | undefined): Severity {
  if (value === null || value === undefined) return 'poor';
  const t = METRIC_THRESHOLDS[metric];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.needsImprovement) return 'warn';
  return 'poor';
}

/** Pill/badge classes — solid severity background, used for compact scores. */
export function severityBadgeClasses(severity: Severity): string {
  switch (severity) {
    case 'good':
      return 'bg-sev-good text-sev-good-foreground';
    case 'warn':
      return 'bg-sev-warn text-sev-warn-foreground';
    case 'poor':
      return 'bg-sev-poor text-sev-poor-foreground';
  }
}

/** Table cell classes — same palette, used for dense metric grids. */
export function severityCellClasses(severity: Severity): string {
  return severityBadgeClasses(severity);
}
