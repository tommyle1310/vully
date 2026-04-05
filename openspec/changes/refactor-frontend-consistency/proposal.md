# Change: Refactor frontend for consistent structure, patterns, and flow

## Why

The Next.js frontend has grown organically across 8+ list pages, 5 detail sheets, 4+ form dialogs, and 14 custom hooks. An audit reveals critical inconsistencies: filter state management varies between `nuqs` URL state and local `useState`; one detail sheet uses an incompatible props API (`onClose` instead of `open/onOpenChange`); skeleton loaders use two different approaches; column definitions are declared inside components in some pages and at module-level in others; Framer Motion page transitions are missing from key pages; staleTime values in hooks follow no clear caching strategy; and query key naming mixes conventions. Additionally, many files far exceed 300 lines—`apartment-form-dialog.tsx` is 1,640 lines, `contract-form-dialog.tsx` is 1,386 lines, and 15 more files exceed the limit—making them difficult to navigate, review, and maintain.

## What Changes

### File Decomposition (>300 line files)
- Split **apartment-form-dialog.tsx** (1,640 lines) into schema, helpers, and 4 tab sub-components
- Split **contract-form-dialog.tsx** (1,386 lines) into schema, helpers, and 3 sub-components (QuickCreateResident, PartyCombobox, financial terms)
- Split **building-parking-tab.tsx** (735 lines) into constants, 5 sub-components, and a custom hook
- Split **apartment-detail-sheet.tsx** (683 lines) into helpers and 6 section sub-components
- Split **building-policies-tab.tsx** (556 lines) into constants, policy form, and display components
- Split **PaymentScheduleTable.tsx** (471 lines) into columns, config, and action components
- Split **use-incidents.ts** (513 lines) into types, query hooks, mutation hooks, and comment hooks
- Extract **columns, filters, and skeletons** from list pages (invoices, contracts, incidents, meter-readings, apartments) into sibling files
- Extract **schemas and sub-components** from form sheets (meter-reading-form-sheet, bulk-generate-dialog)
- Split **contract-detail-sheet.tsx** (424 lines) — extract PaymentSummarySection and terminate dialog
- Split **settings/page.tsx** (486 lines) — extract profile form and password form
- Split **use-apartments.ts** (355 lines) into types, query hooks, and mutation hooks

### List Pages (`page.tsx`)
- Standardize **Framer Motion page transitions** on all list pages (Contracts page currently has none)
- Standardize **skeleton loaders** using dedicated `TableSkeleton` components (not inline)
- Standardize **column definitions** at module-level using `createColumnHelper` (Users page currently uses `useMemo` inside component)
- Migrate filter state from local `useState` to **nuqs** URL state on Contracts, Invoices, Incidents, Users, and Meter Readings pages
- Standardize **page header structure**: `h1` title + `p` description + conditional admin actions
- Standardize **error state rendering** with a shared pattern across all pages
- Move all **constants** (statusVariants, labels, helpers) to module-level outside components

### Detail Sheets
- Align **InvoiceDetailSheet** props to standard `{ open, onOpenChange }` pattern used by all other sheets
- Standardize helper function placement at module-level

### Form Dialogs
- No structural changes (Zod + RHF pattern is already consistent)
- Minor: standardize error handling in submit handlers (try/catch with toast)

### Custom Hooks
- Standardize **query key naming**: kebab-case for multi-word keys (`meter-readings`, `utility-types`, `payment-schedules`)
- Define explicit **staleTime tiers**: static (30min), semi-static (10min), dynamic (5min), real-time (30s)
- Remove unnecessary `async` wrappers in `queryFn` where not needed
- Standardize mutation `onSuccess` invalidation pattern

### Shared Utilities
- Extract common **formatCurrency**, **formatDate** helpers to `lib/format.ts`
- Extract common **status config** types and patterns to a shared location

## Impact
- Affected specs: none (no spec files exist yet)
- Affected code:
  - `apps/web/src/app/(dashboard)/apartments/apartment-form-dialog.tsx` → directory with 7 files
  - `apps/web/src/app/(dashboard)/contracts/contract-form-dialog.tsx` → directory with 6 files
  - `apps/web/src/components/buildings/building-parking-tab.tsx` → directory with 7 files
  - `apps/web/src/app/(dashboard)/apartments/apartment-detail-sheet.tsx` → directory with 8 files
  - `apps/web/src/components/buildings/building-policies-tab.tsx` → directory with 4 files
  - `apps/web/src/components/payments/PaymentScheduleTable.tsx` → directory with 4 files
  - `apps/web/src/hooks/use-incidents.ts` → split into 4 files
  - `apps/web/src/hooks/use-apartments.ts` → split into 3 files
  - `apps/web/src/app/(dashboard)/*/page.tsx` (8 list pages) — extract columns, filters, skeletons
  - `apps/web/src/app/(dashboard)/contracts/contract-detail-sheet.tsx` — extract 2 sub-components
  - `apps/web/src/app/(dashboard)/settings/page.tsx` — extract 2 form components
  - `apps/web/src/app/(dashboard)/invoices/invoice-detail-sheet.tsx` — fix props API
  - `apps/web/src/hooks/use-*.ts` (10+ hooks) — standardize patterns
  - `apps/web/src/lib/format.ts` (new shared utility file)
- No API contract changes, no backend changes, no database changes
- All changes are behavior-preserving (visual output and API calls remain identical)
