import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductList } from '@/components/dashboard/product-list';
import { NoSSR } from '@/components/no-ssr';

export default function ProductsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitored Products</CardTitle>
          <CardDescription>
            Performance data for all tracked Shopify theme products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NoSSR fallback={<TableSkeleton />}>
            <ProductList />
          </NoSSR>
        </CardContent>
      </Card>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}
