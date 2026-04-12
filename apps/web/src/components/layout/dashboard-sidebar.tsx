'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, Home, Building, Users, FileText, FileSignature,
  AlertTriangle, BarChart3, Settings, Gauge, Zap, Clock,
  CreditCard, PanelLeftClose, PanelLeftOpen, ChevronDown,
  Landmark, Receipt, Wrench, ShieldCheck, ClipboardList,
} from 'lucide-react';
import { UserRole } from '@vully/shared-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { usePendingPaymentCount } from '@/hooks/use-pending-payment-count';

// ── Types ──────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}
interface NavGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}
type NavEntry = NavItem | NavGroup;
function isGroup(e: NavEntry): e is NavGroup { return 'items' in e; }

// ── Navigation Config ──────────────────────────────
const navConfig: NavEntry[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  {
    key: 'property', label: 'Property', icon: Landmark,
    items: [
      { href: '/buildings', label: 'Buildings', icon: Building2 },
      { href: '/apartments', label: 'Apartments', icon: Building },
      { href: '/contracts', label: 'Contracts', icon: FileSignature },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: Receipt,
    items: [
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/payments/pending', label: 'Pending Payments', icon: Clock, roles: [UserRole.admin] },
      { href: '/meter-readings', label: 'Meter Readings', icon: Gauge },
      { href: '/utility-types', label: 'Utility Types', icon: Zap, roles: [UserRole.admin] },
    ],
  },
  {
    key: 'operations', label: 'Operations', icon: Wrench,
    items: [
      { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
      { href: '/incidents/my-assignments', label: 'My Assignments', icon: ClipboardList, roles: [UserRole.technician] },
      { href: '/access-card-requests', label: 'Card Requests', icon: CreditCard, roles: [UserRole.admin] },
    ],
  },
  {
    key: 'admin', label: 'Admin', icon: ShieldCheck,
    items: [
      { href: '/users', label: 'Users', icon: Users, roles: [UserRole.admin] },
      { href: '/reports', label: 'Reports', icon: BarChart3, roles: [UserRole.admin] },
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// ── Glassmorphism Style Constants ──────────────────
const glassLink = "relative flex w-full items-center overflow-hidden rounded-xl py-2.5 text-sm font-medium transition-all duration-200";
const glassActive = 'border border-primary/40 bg-primary text-primary-foreground shadow-lg';
const glassInactive = 'border text-muted-foreground hover:text-foreground hover:bg-accent/50 border-border bg-card/50 hover:border-border/80 shadow-sm hover:shadow-md';
const hoverPanelClass = 'w-auto min-w-[190px] rounded-xl border p-2 shadow-lg bg-popover border-border';

// ── Component ──────────────────────────────────────
interface DashboardSidebarProps {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function DashboardSidebar({
  isMobileOpen, isCollapsed, onCloseMobile, onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, hasAnyRole } = useAuthStore();
  const { total: pendingPaymentCount } = usePendingPaymentCount();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    property: true, finance: true, operations: true, admin: true,
  });
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

  const filteredConfig = useMemo(() =>
    navConfig
      .map(entry => {
        if (!isGroup(entry)) return entry.roles && !(user && hasAnyRole(entry.roles)) ? null : entry;
        const items = entry.items.filter(i => !i.roles || (user && hasAnyRole(i.roles)));
        return items.length === 0 ? null : { ...entry, items };
      })
      .filter(Boolean) as NavEntry[],
    [user, hasAnyRole],
  );

  const checkActive = (href: string) => {
    // Exact match always wins
    if (pathname === href) return true;
    // For sub-routes, only highlight if no exact match exists in the current config
    // This prevents /incidents from highlighting when on /incidents/my-assignments
    if (pathname.startsWith(`${href}/`)) {
      // Check if there's a more specific match
      const hasMoreSpecificMatch = filteredConfig.some(entry => {
        if (isGroup(entry)) {
          return entry.items.some(item => pathname === item.href);
        }
        return pathname === entry.href;
      });
      return !hasMoreSpecificMatch;
    }
    return false;
  };
  const getBadge = (href: string) => href === '/payments/pending' ? pendingPaymentCount : 0;
  const openHover = (key: string) => { clearTimeout(hoverTimer.current); setHoveredGroup(key); };
  const closeHover = () => { hoverTimer.current = setTimeout(() => setHoveredGroup(null), 150); };

  // ── Render: Nav Link (glassmorphism) ──
  const renderNavLink = (item: NavItem) => {
    const active = checkActive(item.href);
    const Icon = item.icon;
    const badge = getBadge(item.href);
    const link = (
      <Link
        href={item.href}
        onClick={onCloseMobile}
        className={cn(glassLink, isCollapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3', active ? glassActive : glassInactive)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={cn('overflow-hidden whitespace-nowrap transition-opacity duration-100 ease-linear', isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100')}>
          {item.label}
        </span>
        {badge > 0 && !isCollapsed && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground">{badge}</span>
        )}
      </Link>
    );
    return (
      <div key={item.href} className="relative w-full">
        {badge > 0 && isCollapsed && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground shadow-sm">{badge}</span>
        )}
        {isCollapsed ? (
          <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" className="rounded-lg px-3 py-1.5 text-xs">{item.label}</TooltipContent></Tooltip>
        ) : link}
      </div>
    );
  };

  // ── Render: Hover panel link (simple, inside popover) ──
  const renderPanelLink = (item: NavItem) => {
    const active = checkActive(item.href);
    const Icon = item.icon;
    const badge = getBadge(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
          active ? 'bg-primary/20 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {item.label}
        {badge > 0 && (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">{badge}</span>
        )}
      </Link>
    );
  };

  // ── Render: Expanded Group (collapsible) ──
  const renderExpandedGroup = (group: NavGroup) => (
    <div key={group.key}>
      <button
        onClick={() => setOpenGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 transition-colors hover:text-muted-foreground/80"
      >
        <group.icon className="h-3.5 w-3.5" />
        <span>{group.label}</span>
        <ChevronDown className={cn('ml-auto h-3 w-3 transition-transform duration-200', openGroups[group.key] && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', openGroups[group.key] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="space-y-1.5 pb-1">{group.items.map(renderNavLink)}</div>
        </div>
      </div>
    </div>
  );

  // ── Render: Collapsed Group (icon + hover popover) ──
  const renderCollapsedGroup = (group: NavGroup) => {
    const active = group.items.some(i => checkActive(i.href));
    const GroupIcon = group.icon;
    const badge = group.items.reduce((s, i) => s + getBadge(i.href), 0);
    return (
      <div key={group.key} className="relative w-full">
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground shadow-sm">{badge}</span>
        )}
        <Popover open={hoveredGroup === group.key}>
          <PopoverTrigger asChild>
            <div
              onMouseEnter={() => openHover(group.key)}
              onMouseLeave={closeHover}
              onFocus={() => openHover(group.key)}
              onBlur={closeHover}
              tabIndex={0}
              role="button"
              aria-label={group.label}
              className={cn(glassLink, 'cursor-default justify-center gap-0 px-0', active ? glassActive : glassInactive)}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
            </div>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            onMouseEnter={() => openHover(group.key)}
            onMouseLeave={closeHover}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={hoverPanelClass}
          >
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {group.label}
            </div>
            {group.items.map(renderPanelLink)}
          </PopoverContent>
        </Popover>
      </div>
    );
  };

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
        <button type="button" className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={onCloseMobile} aria-label="Close menu overlay" />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full transition-[width,transform] duration-150 ease-linear will-change-[width,transform] motion-reduce:transition-none',
          isCollapsed ? 'w-[86px]' : 'w-[260px]',
          'lg:static lg:px-3 lg:py-3',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-none border-r border-white/25 bg-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.05)] backdrop-blur-[21px] before:absolute before:left-0 before:right-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent before:content-[''] after:absolute after:left-0 after:top-0 after:z-10 after:h-full after:w-px after:bg-gradient-to-b after:from-white/70 after:via-transparent after:to-white/25 after:content-[''] dark:border-white/[0.10] dark:bg-white/[0.03] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(255,255,255,0.02)] dark:before:via-white/20 dark:after:from-white/20 dark:after:to-white/[0.07] lg:rounded-2xl lg:border lg:border-white/25 dark:lg:border-white/[0.10]">
          <div className={cn('flex h-16 items-center border-b border-white/10 px-4', isCollapsed ? 'justify-center px-2' : 'justify-between pr-12')}>
            <Link href="/dashboard" className={cn('flex items-center gap-2.5', isCollapsed ? 'justify-center' : 'w-full')}>
              <div className={cn('flex shrink-0 items-center justify-center bg-primary/20 text-primary', isCollapsed ? 'h-9 w-9 rounded-xl' : 'h-8 w-8 rounded-lg')}>
                <Building2 className="h-5 w-5" />
              </div>
              <span className={cn('overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight transition-[max-width,opacity] duration-100 ease-linear', isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100')}>
                Vully
              </span>
            </Link>
          </div>

          <TooltipProvider delayDuration={120}>
            <nav className={cn('flex-1 overflow-y-auto', isCollapsed ? 'space-y-1.5 p-2' : 'p-3')}>
              {filteredConfig.map(entry =>
                isGroup(entry)
                  ? isCollapsed ? renderCollapsedGroup(entry) : renderExpandedGroup(entry)
                  : renderNavLink(entry)
              )}
            </nav>
          </TooltipProvider>
        </div>
      </aside>
    </>
  );
}
