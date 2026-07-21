'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ProductPerformanceData } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/date';
import { severityForScore, severityBadgeClasses, Severity } from '@/lib/utils/severity';
import { SeverityFilterChips } from '@/components/dashboard/severity-filter-chips';
import { useProducts } from '@/lib/hooks/use-products';
import { useMeasurements } from '@/lib/hooks/use-measurements';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Severity rank used to sort worst-first: poor, then warn, then good; products with no
// measurements yet rank last so "no data" doesn't masquerade as "poor performance".
const SEVERITY_RANK: Record<Severity, number> = { poor: 0, warn: 1, good: 2 };
const NO_DATA_RANK = 3;

// Average of the latest desktop/mobile scores, or null if neither has run yet.
function overallScore(productData: ProductPerformanceData): number | null {
  const desktop = productData.latestDesktop?.performanceScore;
  const mobile = productData.latestMobile?.performanceScore;
  if (desktop == null && mobile == null) return null;
  if (desktop == null) return mobile!;
  if (mobile == null) return desktop;
  return Math.round((desktop + mobile) / 2);
}

export function ProductList() {
  const { products: rawProducts, isLoading: productsLoading, error: productsError, mutate: mutateProducts } = useProducts(true);
  const { measurements, isLoading: measurementsLoading, error: measurementsError, mutate: mutateMeasurements } = useMeasurements({ limit: 2000 });
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity[]>([]);

  const loading = productsLoading || measurementsLoading;
  const error = productsError || measurementsError
    ? (productsError ?? measurementsError)?.message ?? 'Failed to load products'
    : null;

  // Latest/average per device, computed client-side from one shared
  // measurements fetch instead of one request per product.
  const products = useMemo<ProductPerformanceData[]>(() => {
    return rawProducts.map((product) => {
      const productMeasurements = measurements
        .filter((m) => m.productId === product.id)
        .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());

      const desktopMeasurements = productMeasurements.filter((m) => m.deviceType === 'DESKTOP').slice(0, 10);
      const mobileMeasurements = productMeasurements.filter((m) => m.deviceType === 'MOBILE').slice(0, 10);

      const avgDesktop = desktopMeasurements.length > 0
        ? Math.round(desktopMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / desktopMeasurements.length)
        : 0;
      const avgMobile = mobileMeasurements.length > 0
        ? Math.round(mobileMeasurements.reduce((sum, m) => sum + m.performanceScore, 0) / mobileMeasurements.length)
        : 0;

      return {
        product,
        latestDesktop: desktopMeasurements[0] ?? null,
        latestMobile: mobileMeasurements[0] ?? null,
        measurements: productMeasurements.slice(0, 5),
        averageScore: { desktop: avgDesktop, mobile: avgMobile },
      };
    });
  }, [rawProducts, measurements]);

  const retry = () => {
    mutateProducts();
    mutateMeasurements();
  };

  const runSingleMeasurement = async (productId: string, deviceType: 'DESKTOP' | 'MOBILE') => {
    const response = await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, deviceType })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}: Failed to run measurement`);
    }

    return result;
  };

  // Runs a full test (both Desktop and Mobile) for a product from a single button.
  const runMeasurement = async (productId: string) => {
    try {
      setRefreshing(productId);
      setTestResult(null);

      const [desktopResult, mobileResult] = await Promise.allSettled([
        runSingleMeasurement(productId, 'DESKTOP'),
        runSingleMeasurement(productId, 'MOBILE'),
      ]);

      // Refresh the data regardless of partial failures so any successful run is reflected
      await mutateMeasurements();

      const failures = [desktopResult, mobileResult].filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );

      if (failures.length > 0) {
        const messages = failures
          .map((f) => (f.reason instanceof Error ? f.reason.message : 'Unknown error'))
          .join('; ');
        setTestResult({ type: 'error', message: `Một số phép đo thất bại: ${messages}` });
      } else {
        setTestResult({ type: 'success', message: 'Đo hiệu năng hoàn tất cho cả Desktop và Mobile.' });
      }
    } catch (err) {
      console.error('Error running measurement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setTestResult({ type: 'error', message: `Đo hiệu năng thất bại: ${errorMessage}` });
    } finally {
      setRefreshing(null);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const formatLastUpdated = (measurement: any) => {
    if (!measurement) return 'Chưa có';
    return formatRelativeTime(measurement.measurementDate);
  };

  // Products with a real 'poor' overall score — excludes products with no measurements yet.
  const needsAttention = useMemo(
    () => products.filter((p) => {
      const score = overallScore(p);
      return score !== null && severityForScore(score) === 'poor';
    }),
    [products]
  );

  // Worst-first: poor -> warn -> good -> no data yet, lowest score first within each tier.
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const scoreA = overallScore(a);
      const scoreB = overallScore(b);
      const rankA = scoreA === null ? NO_DATA_RANK : SEVERITY_RANK[severityForScore(scoreA)];
      const rankB = scoreB === null ? NO_DATA_RANK : SEVERITY_RANK[severityForScore(scoreB)];
      if (rankA !== rankB) return rankA - rankB;
      if (scoreA === null || scoreB === null) return 0;
      return scoreA - scoreB;
    });
  }, [products]);

  // Text search on name/URL, plus an explicit severity filter — no-data
  // products only show up when no severity filter is active, since they
  // haven't actually measured as "poor" or anything else yet.
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedProducts.filter((p) => {
      if (q && !p.product.name.toLowerCase().includes(q) && !p.product.url.toLowerCase().includes(q)) {
        return false;
      }
      if (severityFilter.length > 0) {
        const score = overallScore(p);
        if (score === null) return false;
        if (!severityFilter.includes(severityForScore(score))) return false;
      }
      return true;
    });
  }, [sortedProducts, search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-center">
        <div className="text-sev-poor-foreground mb-4">Lỗi: {error}</div>
        <Button onClick={retry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-5 text-center text-muted-foreground">
        Không tìm thấy sản phẩm nào đang hoạt động. Hãy thêm sản phẩm để bắt đầu theo dõi.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {testResult && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            testResult.type === 'success'
              ? 'bg-sev-good text-sev-good-foreground'
              : 'border border-sev-poor bg-sev-poor/10 text-foreground'
          }`}
        >
          {testResult.message}
        </div>
      )}

      {needsAttention.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-sev-poor-foreground mb-2">
            Cần chú ý ngay
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {needsAttention.map((productData) => (
              <div
                key={productData.product.id}
                className="flex-shrink-0 min-w-[150px] rounded-[10px] bg-sev-poor px-4 py-3.5"
              >
                <div className="text-[13px] font-semibold text-sev-poor-foreground">
                  {productData.product.name}
                </div>
                <div className="text-[22px] font-extrabold text-sev-poor-foreground">
                  {overallScore(productData)}
                </div>
                <div className="text-[11px] text-sev-poor-foreground/75">
                  điểm tổng hợp
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[10px] border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên hoặc URL..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <SeverityFilterChips
            value={severityFilter}
            onChange={(v) => {
              setSeverityFilter(v);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Tất cả sản phẩm ({filteredProducts.length})
          </div>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} / trang
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-card p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">
                Sản phẩm
              </TableHead>
              <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">
                Desktop
              </TableHead>
              <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">
                Mobile
              </TableHead>
              <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">
                Cập nhật
              </TableHead>
              <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((productData) => {
              const desktopScore = productData.latestDesktop?.performanceScore;
              const mobileScore = productData.latestMobile?.performanceScore;
              const isRunning = refreshing === productData.product.id;

              return (
                <TableRow key={productData.product.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{productData.product.name}</div>
                      <div className="text-sm text-faint flex items-center gap-1">
                        <a
                          href={productData.product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          {productData.product.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span
                      className={`inline-block min-w-[38px] px-2.5 py-1 rounded-md text-xs font-bold tabular-nums ${
                        desktopScore != null ? severityBadgeClasses(severityForScore(desktopScore)) : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {desktopScore ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span
                      className={`inline-block min-w-[38px] px-2.5 py-1 rounded-md text-xs font-bold tabular-nums ${
                        mobileScore != null ? severityBadgeClasses(severityForScore(mobileScore)) : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {mobileScore ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell className="text-center text-sm text-muted-foreground">
                    {formatLastUpdated(productData.latestDesktop || productData.latestMobile)}
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMeasurement(productData.product.id)}
                      disabled={isRunning}
                    >
                      {isRunning ? 'Đang chạy...' : 'Test'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          Trang {safePage} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Sau
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
