# Performance Optimization Guide - Vully Dashboard

## Current Performance Status ✅

### Build Analysis (March 31, 2026)

```
Route Performance:
├─ Dashboard:       4.11 kB (157 kB total) ✅
├─ Buildings:      13.1 kB (222 kB total)  ✅
├─ Apartments:     7.64 kB (234 kB total)  ✅
├─ Incidents:      25.6 kB (259 kB total)  ⚠️  Heavy
├─ Meter Readings: 28.2 kB (240 kB total)  ⚠️  Heavy
└─ Invoices:       7.29 kB (211 kB total)  ✅

Shared JS:         102 kB (reasonable) ✅
```

## Implemented Optimizations

### 1. **Code Splitting** ✅
- Dynamic imports for dashboard widgets (OccupancyChart, RevenueChart, IncidentsSummary, RecentActivity)
- Lazy loading reduces initial bundle size
- Skeleton loaders prevent CLS (Cumulative Layout Shift)

```tsx
// Example from dashboard page
const RecentActivity = dynamic(
  () => import('@/components/dashboard/recent-activity'),
  { loading: () => <Skeleton className="h-[400px]" /> }
);
```

### 2. **Caching Strategy** ✅

**Backend (Redis):**
- Dashboard stats: 5 min cache
- Analytics data: 5 min cache
- Recent activity: 1 min cache

**Frontend (TanStack Query):**
```tsx
staleTime: 5 * 60 * 1000,      // 5 min before refetch
refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
```

### 3. **Image Optimization** ✅
- Next.js Image component with remote patterns configured
- Supports AWS S3 and local development

### 4. **Database Query Optimization** ✅
- Indexed queries on frequently accessed fields
- Aggregation queries for stats (avoid N+1)
- Prisma connection pooling

### 5. **Skeleton Loaders** ✅
- All async components have loading states
- Prevents layout shift (CLS = 0 target)

## Performance Targets

| Metric | Target | Tool |
|--------|---------|------|
| Lighthouse Performance | > 90 | Chrome DevTools |
| CLS (Cumulative Layout Shift) | < 0.1 | Web Vitals |
| LCP (Largest Contentful Paint) | < 2.5s | Web Vitals |
| FID (First Input Delay) | < 100ms | Web Vitals |
| TTI (Time to Interactive) | < 3.8s | Lighthouse |
| Bundle Size (First Load) | < 300 kB | Next.js Build |

## Monitoring

### Web Vitals Reporting
Use `src/lib/web-vitals.ts` to track real user metrics:

```tsx
// In app/layout.tsx or pages/_app.tsx
import { reportWebVitals } from '@/lib/web-vitals';

export { reportWebVitals };
```

### Bundle Analysis
```bash
cd apps/web
pnpm add -D @next/bundle-analyzer
```

Update `next.config.js`:
```js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run analysis:
```bash
ANALYZE=true pnpm run build
```

## Optimization Recommendations

### Short Term (This Sprint)
- [ ] Add Web Vitals reporting to production
- [x] Implement dynamic imports for heavy widgets
- [x] Add skeleton loaders for all async content
- [ ] Optimize large pages (incidents, meter-readings)
  - Use virtualization for lists > 100 items
  - Implement pagination or infinite scroll

### Medium Term (Next Sprint)
- [ ] Implement service worker for offline support
- [ ] Add prefetching for likely navigation paths
- [ ] Optimize images (WebP format, responsive sizes)
- [ ] Add HTTP/2 server push for critical resources

### Long Term (Future Releases)
- [ ] Implement partial hydration (React Server Components)
- [ ] Add edge caching with CDN
- [ ] Implement incremental static regeneration (ISR)
- [ ] Consider micro-frontend architecture for modules

## Quick Wins

### 1. Font Optimization
Add to `app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

### 2. Metadata for SEO
```tsx
export const metadata = {
  title: 'Vully - Apartment Management',
  description: 'Modern apartment management platform',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000',
};
```

### 3. Reduce JavaScript Execution Time
- Use `useCallback` for event handlers in lists
- Memoize expensive computations with `useMemo`
- Defer non-critical JavaScript with `next/script`

### 4. API Response Optimization
```tsx
// Use cursor-based pagination for large datasets
const { data } = useQuery({
  queryKey: ['incidents', cursor],
  queryFn: () => api.getIncidents({ cursor, limit: 50 }),
});
```

## Testing Performance

### Local Development
```bash
# Build and run production server
cd apps/web
pnpm run build
pnpm run start

# Open http://localhost:3000
# Open DevTools > Lighthouse > Run audit
```

### CI/CD Integration
Add to GitHub Actions:
```yaml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

## Resources
- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring Guide](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
