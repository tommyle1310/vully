'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Home,
  Building,
  Users,
  FileText,
  FileSignature,
  AlertTriangle,
  BarChart3,
  Settings,
  Gauge,
  Zap,
  Clock,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UserRole } from '@vully/shared-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/apartments', label: 'Apartments', icon: Building },
  { href: '/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/buildings', label: 'Buildings', icon: Building2 },
  { href: '/users', label: 'Users', icon: Users, roles: [UserRole.admin] },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payments/pending', label: 'Pending Payments', icon: Clock, roles: [UserRole.admin] },
  { href: '/access-card-requests', label: 'Card Requests', icon: CreditCard, roles: [UserRole.admin] },
  { href: '/meter-readings', label: 'Meter Readings', icon: Gauge },
  { href: '/utility-types', label: 'Utility Types', icon: Zap, roles: [UserRole.admin] },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: [UserRole.admin] },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function DashboardSidebar({
  isMobileOpen,
  isCollapsed,
  onCloseMobile,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, hasAnyRole } = useAuthStore();
  const filteredNavItems = useMemo(
    () => navItems.filter((item) => !item.roles || (user && hasAnyRole(item.roles))),
    [user, hasAnyRole]
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 z-[60] hidden h-8 w-8 -translate-x-1/2 overflow-hidden rounded-full border border-white/25 bg-white/[0.08] text-foreground/80 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[21px] transition-[left] duration-150 ease-linear before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent before:content-[''] hover:border-white/40 hover:bg-white/[0.15] hover:text-foreground dark:border-white/[0.10] dark:bg-white/[0.04] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] dark:before:via-white/20 dark:hover:border-white/[0.18] dark:hover:bg-white/[0.08] lg:flex"
        style={{ left: isCollapsed ? 74 : 248 }}
        onClick={onToggleCollapsed}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full transition-[width,transform] duration-150 ease-linear will-change-[width,transform] motion-reduce:transition-none',
          isCollapsed ? 'w-[86px]' : 'w-[260px]',
          'lg:static lg:px-3 lg:py-3',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-none border-r border-white/25 bg-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.05)] backdrop-blur-[21px] before:absolute before:left-0 before:right-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent before:content-[''] after:absolute after:left-0 after:top-0 after:z-10 after:h-full after:w-px after:bg-gradient-to-b after:from-white/70 after:via-transparent after:to-white/25 after:content-[''] dark:border-white/[0.10] dark:bg-white/[0.03] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(255,255,255,0.02)] dark:before:via-white/20 dark:after:from-white/20 dark:after:to-white/[0.07] lg:rounded-2xl lg:border lg:border-white/25 dark:lg:border-white/[0.10]">
        <div
          className={cn(
            'flex h-16 items-center border-b border-white/10 px-4',
            isCollapsed ? 'justify-center px-2' : 'justify-between pr-12'
          )}
        >
          <Link
            href="/dashboard"
            className={cn('flex items-center gap-2.5', isCollapsed ? 'justify-center' : 'w-full')}
          >
            <div
              className={cn(
                'flex shrink-0 items-center justify-center bg-primary/20 text-primary',
                isCollapsed ? 'h-9 w-9 rounded-xl' : 'h-8 w-8 rounded-lg'
              )}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight transition-[max-width,opacity] duration-100 ease-linear',
                isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'
              )}
            >
              Vully
            </span>
          </Link>
        </div>

        <TooltipProvider delayDuration={120}>
          <nav className={cn('flex-1 space-y-1.5', isCollapsed ? 'p-2' : 'p-3')}>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const navLink = (
              <Link
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group relative flex w-full items-center overflow-hidden rounded-xl py-2.5 text-sm font-medium transition-all duration-200 before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent before:content-['']",
                  isCollapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
                  isActive
                    ? 'border border-primary/40 bg-primary/85 text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.4),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-[21px] dark:bg-primary/75 dark:shadow-[0_8px_24px_hsl(var(--primary)/0.25),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border border-white/25 bg-white/[0.08] text-muted-foreground/95 shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[21px] hover:-translate-y-[1px] hover:border-white/40 hover:bg-white/[0.13] hover:text-foreground hover:shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.08] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.07)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap transition-opacity duration-100 ease-linear',
                    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            return (
              <div
                key={item.href}
                className="w-full"
              >
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" className="rounded-lg px-3 py-1.5 text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  navLink
                )}
              </div>
            );
          })}
          </nav>
        </TooltipProvider>
        </div>
      </aside>
    </>
  );
}
