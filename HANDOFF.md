# QC Apps Prototype — Session Handoff

> Give this file to a new Claude Code session to get full context immediately.

---

## What This Project Is

A **Vite + React 18 + TypeScript SPA** (pnpm) connected to **Supabase** (Postgres + PostgREST + anon key). It's a QC task management prototype for food-hub quality control officers. No backend code — all DB calls go through `@supabase/supabase-js` in the frontend.

**Key paths:**
- `src/features/` — one folder per page
- `src/data/queries.ts` — all Supabase queries
- `src/lib/types.ts` — shared TypeScript interfaces
- `src/lib/rules.ts` — pure business logic (sampling qty, risk priority, leveling)
- `src/styles/prototype.css` — single CSS file, all styling
- `src/components/Rail.tsx` — collapsible sidebar nav

**Routing:** React Router v6, all under `/app/*`. Roles: `spv` (supervisor/admin) and `officer`.

**State:** `@tanstack/react-query` v5. Note: `staleTime: 5 min` — hard refresh (Ctrl+Shift+R) clears cache when data appears stale.

---

## Current Branch Status

**`main`** is up to date. All branches merged. Working from `main` directly.

---

## What Was Already Built (Merged to Main)

| Feature | PR / Branch |
|---------|-------------|
| M0–M6 full scaffold (auth, tasks, dashboard, approval, SPV verification, history) | `feat/m0–m6` |
| Master SKU Leveling page (5,661 SKUs paginated) | `feat/reseed-full-leveling` |
| Priority Generator (CSV upload → risk score → priority list) | `feat/pr2-priority-generator` |
| Saved Priority List (separate page, week filter) | `feat/pr3-saved-priority-list` |
| QC Task Generator (WMS inventory upload → generate tasks per hub) | `feat/fix-task-generator` |
| Hub Salemba added to login mock data | `feat/fix-task-generator` |
| Task bulk upload + bulk-assign officer | `feat/pr5-task-bulk` |
| Collapsible sidebar + `wms_inventory` stock info for officer task flow | `feat/officer-ux-fixes` |

---

## Pending: Supabase SQL Migration

The `feat/officer-ux-fixes` branch is merged. Run this in Supabase SQL Editor if not done yet — these columns may not exist:

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS soh INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sloc TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expiry_date DATE;
```

Then **re-run the QC Task Generator** for each hub so new tasks get `soh/sloc/expiry_date` populated. Old tasks generated before this migration will show `—` for stock info until regenerated.

> If you already deleted all tasks from Task Management before the new session, just run the migration then regenerate — no old data to worry about.

### New: `inspections`/`status_changes` FK still point at `stock`, blocking Submit Inspection

Found live 2026-07-16: an officer submitting an inspection for a task whose `sku_id` isn't in the legacy `stock` table (e.g. any SKU generated from a WMS upload — the officer flow no longer requires `stock` rows) gets a `23503` FK violation on insert into `inspections`, because `inspections.sku_id` and `status_changes.sku_id` still reference `stock(sku_id)`. `tasks.sku_id` was already migrated to `master_leveling(sku_id)` (see above) — these two tables were missed.

The app code was updated to embed `master_leveling` instead of `stock` in the approval/verification/history queries (`fetchPendingApprovals`, `fetchAuditLog`, `fetchCompletedInspections` in `queries.ts`), aliased back to `stock:` so the existing `.stock?.name` reads in `ApprovalQueuePage.tsx` / `SpvVerificationPage.tsx` / `ChangeHistoryPage.tsx` keep working unchanged. One casualty: the SLOC/Stock-on-Hand rows in `ApprovalQueuePage.tsx`'s detail panel were removed — `master_leveling` doesn't carry those columns (they now live in `wms_inventory`, same as the officer StockPage fix). Restoring them via a `wms_inventory` lookup is follow-up work, not done yet.

**Run this in Supabase SQL Editor** — required for Submit Inspection to work for any generated task:

```sql
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_sku_id_fkey;
ALTER TABLE inspections ADD CONSTRAINT inspections_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES master_leveling(sku_id);

ALTER TABLE status_changes DROP CONSTRAINT IF EXISTS status_changes_sku_id_fkey;
ALTER TABLE status_changes ADD CONSTRAINT status_changes_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES master_leveling(sku_id);
```

> `master_leveling.sku_id`'s own FK to `stock` also appears to have already been dropped live (SKUs generated purely from WMS uploads exist in `master_leveling` but not `stock`) — `schema.sql` has been updated to drop it too, but no action needed live since it's apparently already gone.

### Fixed: inspection photo upload `InvalidKey` error

Also found live 2026-07-16: uploading a photo during Submit Inspection could fail with Supabase Storage `400 InvalidKey` because the storage object key embedded the raw camera file name verbatim (`${hubId}/${Date.now()}-${file.name}`), and phone-exported file names can contain characters Storage rejects (spaces, unicode ellipses, etc). Fixed in `src/lib/image.ts` — added `safePhotoPath()` which builds the key from hub id + timestamp + index + a sanitized extension only, never the original name. No migration needed, code-only fix, covered by `src/lib/image.test.ts`.

---

## Key Architecture Decisions & Quirks

### `wms_inventory` replaces `stock` for task flow
- `stock` table is legacy — it's not populated for Hub Salemba and is capped at 1,000 rows by PostgREST.
- All officer task screens now read from `wms_inventory` (uploaded via QC Task Generator).
- `fetchWmsInventoryBySku(skuId, hubId)` in `queries.ts` does a single-row lookup ordered by `uploaded_at DESC`.
- `StockPage.tsx` resolution chain: `task.soh ?? wmsRow?.soh_available ?? 0` (task columns first, wms fallback).

### PostgrestError is not `instanceof Error`
```typescript
// CORRECT pattern for catching Supabase errors:
const msg = err instanceof Error ? err.message : (err as {message?:string})?.message ?? JSON.stringify(err)
```

### Excel date serials in CSV
WMS CSV exports have dates as Excel serial numbers (e.g. `46211.00013888889`). The `excelSerialToDate()` helper in `TaskGeneratorPage.tsx` handles this:
- Regex `/^\d{4,5}(\.\d+)?$/` → convert via `Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000`
- Regex `/^\d{4}-\d{2}-\d{2}/` → pass through as-is
- Anything else (e.g. `"2"`) → return `''` → becomes `null`

### WMS location IDs → hub IDs
WMS files use numeric location IDs. Mapping in `TaskGeneratorPage.tsx`:
```typescript
const LOCATION_TO_HUB: Record<string, string> = { '929': 'hub-salemba' }
```
Add new hubs here as you onboard them.

### tasks.sku_id FK
Was previously pointing to `stock` table. **Already migrated** to reference `master_leveling(sku_id)` in Supabase. SQL that was run:
```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_sku_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES master_leveling(sku_id);
```

### `approval`, `verification`, `history` still join `stock`
`ApprovalQueuePage`, `SpvVerificationPage`, `ChangeHistoryPage` use PostgREST embedded joins from `status_changes`/`inspections` → `stock`. Changing those requires a DB FK migration to point to `master_leveling` instead — not done yet, flagged as future work.

### Collapsible sidebar
`Rail.tsx` uses `localStorage` key `rail_collapsed`. CSS in `prototype.css` handles `.rail.collapsed` width transition.

### Mock login
`LoginPage.tsx` has hardcoded mock hubs and users. Current hubs: `hub-horenzo`, `hub-salemba`. Users include `spv` and `officer` roles for each hub.

---

## Data Flow: QC Task Generator

1. User uploads **Product Detail CSV** (Superset export) in QC Task Generator
2. `parseInventory()` maps: `fpd.product_id` → `sku_id`, `stock` → `soh_available`, `rack_name` → `sloc`, `expiry_date` → converted via `excelSerialToDate()`
3. `LOCATION_TO_HUB` maps numeric location → hub ID
4. `uploadWmsInventory()` chunks inserts at 500/batch into `wms_inventory`
5. `generateTasks()` joins `priority_list` × `wms_inventory` per selected hub, deletes existing generated tasks for that hub, inserts new ones with `soh/sloc/expiry_date` populated
6. Officer sees task in inbox → opens StockPage → reads `wms_inventory` via `fetchWmsInventoryBySku`

---

## Next Improvements (from `plan-improvements.md`)

The improvements plan is at `plan-improvements.md` in the repo root. Key remaining items:

| # | Item | Status |
|---|------|--------|
| 1 | Split Priority Generator / Saved Priority List pages | ✅ Done |
| 2 | Week window selector in generator | ✅ Done |
| 3 | Spreadsheet upload (xlsx/csv) for priority scoring | ✅ Done |
| 4 | Run Weekly Generator → write Saved Priority List | ✅ Done |
| 5 | Sync Master SKU Leveling on Run | ✅ Done |
| 6 | QC Task Generator page (inventory upload + hub select + generate) | ✅ Done |
| 7 | Post-generation summary per hub | ✅ Done |
| 8 | Bulk upload in Task Management | ✅ Done |
| 9 | Bulk-assign officer to pending tasks | ✅ Done |
| 10 | Split dashboard into Main + Verification pipelines | ⬜ Not started |
| 11 | Rename "Phase 2" sidebar group → "QC Task Generator" | ✅ Done |

**Item 10 is the main remaining improvement** from the original plan: the Dashboard currently shows one unified lifecycle strip. It should split into two labeled strips — Main Pipeline and Verification Pipeline (see `plan-improvements.md` §2 item 10 for details).

---

## How to Run

```bash
cd "C:\Users\Aditya Binowo\Documents\QC Apps Prototype\qc-apps-prototype"
pnpm dev
```

Build check: `pnpm build`
Tests: `pnpm test`

**Supabase:** credentials in `.env` (not committed). Project is on Supabase cloud.

---

## Login Credentials (Mock)

| Role | Email | Hub |
|------|-------|-----|
| SPV | `spv.horenzo@astronauts.id` | Hub Horenzo |
| Officer | `officer.horenzo@astronauts.id` | Hub Horenzo |
| SPV | `spv.salemba@astronauts.id` | Hub Salemba |
| Officer (Joko P) | `officer.salemba@astronauts.id` | Hub Salemba |

Password: any non-empty string (mock auth, no real validation).

---

## GitHub

Repo: `https://github.com/adityabinowo/qc-apps-prototype`
Main branch: `main`
Current open PR: `feat/officer-ux-fixes`

`gh` CLI may not be authenticated in the session — create PRs via browser if `gh pr create` fails.
