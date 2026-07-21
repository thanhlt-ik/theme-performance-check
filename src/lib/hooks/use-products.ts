'use client';

import useSWR from 'swr';
import { Product } from '@/lib/types';

/**
 * Shared product list — every dashboard page that needs products (sidebar
 * count, Products table, Analytics filters, Export form) hits this same SWR
 * key, so only the first mount on a given page load actually fetches.
 */
export function useProducts(activeOnly = false) {
  const key = activeOnly ? '/api/products?active=true' : '/api/products';
  const { data, error, isLoading, mutate } = useSWR<Product[]>(key);

  return { products: data ?? [], isLoading, error, mutate };
}
