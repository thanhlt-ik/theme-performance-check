'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SWRConfig } from 'swr';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/lib/hooks/use-theme';
import { useProducts } from '@/lib/hooks/use-products';
import { apiFetcher } from '@/lib/swr-fetcher';
import { JobProgressProvider } from '@/lib/hooks/use-job-progress';
import { JobProgressPanel } from '@/components/dashboard/job-progress-panel';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/charts', label: 'Analytics' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/jobs', label: 'Scheduled Jobs' },
  { href: '/dashboard/export', label: 'Export' },
  // Settings is not implemented yet — keep the route reachable directly but
  // don't advertise it in nav until it does something.
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              isActive
                ? 'bg-muted font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-brand' : 'bg-border'}`}
            />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { products, isLoading } = useProducts(true);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="h-[22px] w-[22px] shrink-0 rounded-md bg-brand" />
        <span className="text-sm font-bold tracking-tight text-foreground">Perf Monitor</span>
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="border-t border-border px-5 py-3.5 text-[11px] text-faint">
        {isLoading ? '—' : products.length} cửa hàng theo dõi
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const activeLabel = NAV_ITEMS.find((n) => n.href === pathname)?.label ?? '';

  return (
    <SWRConfig value={{ fetcher: apiFetcher }}>
    <JobProgressProvider>
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col border-r border-border bg-card">
        <SidebarContent />
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[250px] border-r border-border bg-card shadow-lg transition-transform duration-200 ease-out md:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileNavOpen(false)}
          className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 truncate text-sm font-semibold">{activeLabel}</div>
          <button
            onClick={toggleTheme}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <JobProgressPanel />
    </div>
    </JobProgressProvider>
    </SWRConfig>
  );
}
