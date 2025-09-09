'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  BarChart3, 
  Download, 
  Home, 
  Settings,
  Clock,
  Database
} from 'lucide-react';

// Custom NavLink component that handles active state
function NavLink({ href, children, className }: { 
  href: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600' 
          : 'text-muted-foreground hover:text-primary hover:bg-muted'
      } ${className || ''}`}
    >
      {children}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hidden md:flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10">
        <div className="flex h-full max-h-screen flex-col gap-2">
          {/* Logo */}
          <div className="flex h-[60px] items-center border-b px-6">
            <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
              <Activity className="h-6 w-6 text-blue-600" />
              <span>Performance Monitor</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <NavLink href="/dashboard">
                <Home className="h-4 w-4" />
                Dashboard
              </NavLink>
              <NavLink href="/dashboard/charts">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </NavLink>
              <NavLink href="/dashboard/products">
                <Database className="h-4 w-4" />
                Products
              </NavLink>
              <NavLink href="/dashboard/jobs">
                <Clock className="h-4 w-4" />
                Scheduled Jobs
              </NavLink>
              <NavLink href="/dashboard/export">
                <Download className="h-4 w-4" />
                Export Data
              </NavLink>
              <NavLink href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                Settings
              </NavLink>
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="text-xs text-muted-foreground">
              <div className="mb-1">Shopify Performance</div>
              <div>Monitoring System v1.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/10 px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Shopify Performance Monitor</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Removed Home button since we're redirecting from home to dashboard */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Mobile layout could be implemented here in the future if needed
