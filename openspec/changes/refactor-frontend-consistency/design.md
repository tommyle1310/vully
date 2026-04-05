## Context

The Next.js 15 frontend has 8 list pages, 5 detail sheets, 4+ form dialogs, and 14+ custom hooks that were built incrementally over multiple feature cycles. Each was implemented with slightly different conventions, resulting in a fragmented codebase that's harder to maintain and extend. Additionally, 17 files exceed 300 lines (two exceed 1,300 lines), making individual files difficult to navigate and review. This refactor is purely structural — no new features, no API changes, no visual changes.

### Constraints
- All existing functionality MUST remain identical (behavior-preserving refactor)
- No API contract changes, no backend changes, no Prisma schema changes
- No new npm dependencies (use only what's already installed: nuqs, framer-motion, @tanstack/react-table, etc.)
- Each task is independently mergeable — incremental delivery
- Visual output must be pixel-identical before/after (except where transitions are added)
- No file should exceed ~300 lines after refactoring (soft limit — minor overages acceptable for cohesive components)

## Goals / Non-Goals

### Goals
- Establish a single canonical pattern for each file category (list page, detail sheet, form dialog, hook)
- Decompose all files exceeding ~300 lines into smaller, focused modules
- Migrate all filter state to nuqs URL state management
- Ensure consistent Framer Motion page transitions on all pages
- Standardize skeleton loaders to prevent CLS
- Define and apply a clear staleTime caching strategy across all hooks
- Extract duplicated helpers (formatCurrency, formatDate) to shared utilities

### Non-Goals
- Adding new features or pages
- Changing visual design or layout
- Converting utility-types or meter-readings card layouts to TanStack Table (they use cards intentionally for different UX)
- Refactoring backend code
- Changing the form dialog vs sheet decision per component (the current choice of Dialog for CRUD forms and Sheet for data-heavy panels is acceptable)
- Adding test coverage (this is a structural refactor with no behavior changes)
- Splitting files that are close to 300 lines if they are already cohesive (e.g., a 310-line component with no clear split point)

## Decisions

### D0: File Size Limit — 300 Lines

No single `.tsx` or `.ts` file should exceed ~300 lines. When a file grows beyond this, it MUST be decomposed using these extraction patterns (in priority order):

1. **Constants / config / types** → sibling `[name]-constants.ts` or `[name].types.ts`
2. **Zod schemas** → sibling `[name]-schema.ts`
3. **Helper / utility functions** → sibling `[name]-helpers.ts` or shared `lib/format.ts`
4. **Column definitions** → sibling `[name]-columns.tsx`
5. **Sub-components** → sibling files or `components/` subdirectory
6. **Hook logic (queries, mutations)** → split by concern into separate hook files with barrel re-export

For large components that convert into directories, the original file becomes `index.tsx` or keeps its name and sub-files go into a `components/` sibling directory. Barrel `index.ts` exports are used to keep import paths unchanged.

#### Decomposition Plan — Large Files

| File | Lines | Strategy |
|------|-------|----------|
| `apartment-form-dialog.tsx` | 1,640 | → schema + helpers + 4 tab components + main (~250) |
| `contract-form-dialog.tsx` | 1,386 | → schema + helpers + QuickCreateResident + PartyCombobox + financial-terms + main (~300) |
| `building-parking-tab.tsx` | 735 | → constants + 5 sub-components + custom hook + main (~250) |
| `apartment-detail-sheet.tsx` | 683 | → helpers + 6 section components + main (~200) |
| `building-policies-tab.tsx` | 556 | → constants + policy-form + current-policy-card + policy-history + main (~150) |
| `use-incidents.ts` | 513 | → types + queries + mutations + comments + barrel re-export |
| `invoices/page.tsx` | 487 | → columns + skeleton + filters + main (~250) |
| `contracts/page.tsx` | 487 | → columns + helpers + skeleton + main (~250) |
| `settings/page.tsx` | 486 | → profile-form + password-form + schemas + main (~150) |
| `PaymentScheduleTable.tsx` | 471 | → columns + config + actions + skeleton + main (~200) |
| `meter-reading-form-sheet.tsx` | 444 | → schema + apartment-combobox + constants + main (~280) |
| `incidents/page.tsx` | 426 | → columns + config + skeleton + main (~200) |
| `contract-detail-sheet.tsx` | 424 | → PaymentSummarySection + terminate-dialog + main (~200) |
| `floor-plan.tsx` | 418 | → controls-hook + svg-processor + main (~280) |
| `apartments/page.tsx` | 415 | → columns + skeleton (already has filters extracted) + main (~250) |
| `bulk-generate-dialog.tsx` | 413 | → category-config + job-status-hook + main (~280) |
| `use-apartments.ts` | 355 | → types + queries + mutations + barrel re-export |

## Decisions

### D1: Canonical List Page Structure

Every list page (`page.tsx`) MUST follow this skeleton:

```
'use client';
// 1. React/Next imports
// 2. Framer Motion
// 3. TanStack imports
// 4. Lucide icons
// 5. UI components (shadcn)
// 6. Custom hooks
// 7. Custom components
// 8. Lib utilities

// Module-level constants (statusVariants, labels, etc.)
// Module-level column definitions (createColumnHelper)
// Module-level helper functions

// TableSkeleton component (dedicated, not inline)

// Default export: Page component
//   - URL state (nuqs)
//   - Local UI state (dialog open, selected item)
//   - TanStack Query hooks
//   - TanStack Table setup
//   - Loading → TableSkeleton
//   - Error → standardized error block
//   - Content → motion.div wrapper with table
```

### D2: Canonical Detail Sheet Props

All detail sheets MUST use this interface pattern:

```typescript
interface [Name]DetailSheetProps {
  [resource]: ResourceType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (resource: ResourceType) => void;
}
```

The `open` / `onOpenChange` pattern is consistent with Shadcn/UI's Sheet API and all other sheets in the project. InvoiceDetailSheet's `onClose` pattern is the sole deviation and must be aligned.

### D3: staleTime Caching Tiers

| Tier | Duration | Use For |
|------|----------|---------|
| Static | 30 min | Utility types, building metadata |
| Semi-static | 10 min | Buildings list, apartments list |
| Dynamic | 5 min | Contracts, invoices, incidents, meter readings |
| Real-time | 30 sec | Billing job polling, active WebSocket data |

### D4: Shared Format Utilities

Extract to `apps/web/src/lib/format.ts`:
- `formatCurrency(amount: number): string` — Vietnamese dong formatting
- `formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string`

These are currently duplicated in 4+ files with identical implementations.

### D5: Query Key Convention

All query keys use kebab-case for multi-word terms and nest child resources under parent:

```typescript
// Top-level resources
['apartments', filters]
['buildings', filters]
['contracts', filters]
['invoices', filters]
['incidents', filters]
['meter-readings', filters]
['utility-types']
['users', filters]

// Nested resources
['contracts', contractId, 'payment-schedules']
['contracts', contractId, 'financial-summary']
['incidents', incidentId, 'comments']
```

### D6: Framer Motion Page Wrapper

All list pages wrap their return in:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="space-y-6"
>
```

This is already used by apartments, incidents, meter-readings, utility-types, and buildings. Contracts, invoices, and users must adopt it.

## Risks / Trade-offs

- **Risk**: Migrating filter state to nuqs could briefly break bookmarked URLs if filter params change
  - Mitigation: nuqs handles missing params gracefully with defaults
- **Risk**: Changing InvoiceDetailSheet props requires updating its parent (invoices/page.tsx)
  - Mitigation: Single call site, straightforward prop change
- **Risk**: Large diff across many files
  - Mitigation: Tasks are ordered so each can be merged independently

## Open Questions

None — all patterns are already established in at least one file in the codebase. This refactor applies the best existing pattern consistently.
