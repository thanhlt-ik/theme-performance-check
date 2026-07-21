'use client';

import useSWR from 'swr';
import { PerformanceMeasurement, DeviceType } from '@/lib/types';

export interface MeasurementsParams {
  productId?: string;
  deviceType?: DeviceType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

function buildKey(params: MeasurementsParams): string {
  const sp = new URLSearchParams();
  if (params.productId) sp.set('productId', params.productId);
  if (params.deviceType) sp.set('deviceType', params.deviceType);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  if (params.limit) sp.set('limit', String(params.limit));
  return `/api/measurements?${sp.toString()}`;
}

/**
 * Shared measurements fetch — components that used to each pull their own
 * limit=1000/2000 snapshot (Overview stats, Core Web Vitals, Products table,
 * Overview trend) now share one cached request per unique (product, device,
 * range) key instead of re-fetching the same rows repeatedly.
 */
export function useMeasurements(params: MeasurementsParams) {
  const key = buildKey(params);
  const { data, error, isLoading, mutate } = useSWR<PerformanceMeasurement[]>(key);

  return { measurements: data ?? [], isLoading, error, mutate };
}
