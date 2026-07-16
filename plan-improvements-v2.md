# plan-improvements-v2.md — Dashboard columns, Task detail, Officer Done (for Claude Code)

Four improvements to the updated repo. **Do them one part at a time — one PR per part**, in the order below. Items 3 and 4 ship together in one PR. `PR0` is a shared data prerequisite (schema + write paths) that PR1–PR3 all depend on — do it first.

**Reviewed mockup:** `improvements-v2-mockup.html` (workspace root, one level above this repo) — match its layout/copy per screen ①–④.

## Decisions locked (from review)
- **Sorted bad qty** (Available→Bad quantity): **entered at the 1:1 sort step** (option C). Stored as `status_changes.qty_changed`. Quarantine All → whole SOH (auto); Conditionally Accepted → officer's sorted bad count; Accepted → none.
- **Step-1 data:** persist the **full checklist** (storage condition, color, texture, packaging, seal, cleanliness) + early-stop, and show it.
- **Task detail:** a **full page** at `/app/tasks/:id`.
- **Officer Done:** read-only filled-data view + **Print** opens the existing Quality Receipt page (PDF).

**Assumptions (correct if wrong):** the full Task detail page is **SPV/admin only** (officers use the mobile read-only Done view); the detail page shows "not yet inspected" empty states for Pending tasks.

---

## PR0 — Data foundations (schema + write paths) · do first
Nothing to display exists yet in the DB, so persist it first.

**`supabase/schema.sql`** (idempotent `ALTER … ADD COLUMN IF NOT EXISTS`):
- `inspections`: `storage_condition TEXT`, `early_stop BOOLEAN DEFAULT FALSE`, `early_reason TEXT`, `color TEXT`, `texture TEXT`, `packaging TEXT`, `seal TEXT`, `cleanliness TEXT`.
- `status_changes`: `qty_changed INTEGER`.

**`src/lib/types.ts`:** add the fields to `InspectionInterface` and `StatusChangeInterface`.

**Officer Step 1 (`InspectionStep1Page.tsx`):** keep temp + storage condition + early stop, and add the physical checklist inputs — `color`, `texture` (Normal / Toleransi / Tidak Normal), `packaging`, `seal` (Normal / Rusak / Bocor), `cleanliness` (Normal / Kotor). Pass them all forward in `step1` router state.

**Officer Step 2 (`InspectionStep2Page.tsx`) → `createInspection`:** include the Step-1 fields in the insert payload (map `step1.*` → the new columns).

**Sorted bad qty capture (`ResultPage.tsx`):** when `decision === 'Conditionally Accepted'`, show a numeric **"Sorted bad qty (1:1)"** input; use it as `qty_changed` when the status change is created. For `Quarantine All`, set `qty_changed = soh` automatically. For `Accepted`, no status change (no qty).

**`src/data/queries.ts`:** `createInspection` accepts the new fields; the `status_changes` insert (both `inspection` and `verification` sources) includes `qty_changed`; ensure the approval path preserves it. Make sure any inspection/status-change `select` includes the new columns.

**Verify:** submit an inspection → the Step-1 checklist + a status change with `qty_changed` persist in Supabase.

---

## PR1 — Item 1: Dashboard QC results columns (mockup ①)
**`fetchDashboardKpis` (queries.ts):** for the `inspections` list, also fetch the linked **verification** (`band`, `compliance_pct`, `match_flag`) and **status_change** (`state`, `qty_changed`) — e.g. embedded selects `verifications(band,compliance_pct,match_flag)` and `status_changes(state,qty_changed)` keyed on `inspection_id`.

**`DashboardPage.tsx` QC-results table:** add three columns after `Result`:
- **Officer accuracy** — `{band} · {pct}%` chip (green PASSED / yellow PASSED_WITH_NOTE / red NOT_PASSED); `— not verified` when no verification row.
- **Stock condition** — `Match` (green) / `Mismatch` (orange) from `match_flag`; `—` when not verified.
- **Avail → Bad** — `{qty_changed} pcs` (red) only when the status change is `Approved`; else `—`.

**Verify:** matches mockup ① — a verified+approved row shows all three; an un-verified row shows dashes.

---

## PR2 — Item 2: Task detail full page (mockup ②)
- **Route** `/app/tasks/:id` + `src/features/tasks/TaskDetailPage.tsx`; make Task Management rows link to it. SPV/admin only.
- **`fetchTaskDetail(taskId)` (queries.ts):** returns the task (+ leveling/stock name), its **inspection** (+ `inspection_photos`), the **verification**, and the **status_change**.
- **Render** per mockup ②: header (SKU, task id, officer, deadline, status chip, priority/level); **Inspection detail** (stock/SLOC, sampling qty, temp, expiry, the full Step-1 checklist, Step-2 good/bad/total/%NC/decision/action, defect-reason chips, notes, photo thumbnails); **SPV Verification** (sample, good found, compliance band = officer accuracy; Match/Mismatch = stock condition, with severity/defect type/wastage on mismatch); **Stock status change** (Available→Bad, `qty_changed` = sorted bad qty, state, approver).
- **Empty states:** Pending/no-inspection → "Not yet inspected"; no verification → "Not yet verified"; no change → "No status change".

**Verify:** clicking a Done task shows the full officer inspection + verification + change; a Pending task shows the empty states.

---

## PR3 — Items 3 + 4: Officer inbox Done (mockup ③ + ④)
**`InboxPage.tsx`:**
- Add **`Done`** ("Selesai") to the filter chips (`['All','Pending','In Progress','Done','Overdue']`).
- **Done cards are read-only** — no "start/continue" tap. Instead show two buttons: **Lihat** (view read-only data) and **Cetak / Print receipt**. Print appears **only** on Done cards. Pending/In Progress keep their start/continue behavior.

**Read-only Done view** (mockup ④): route `/app/officer/done/:taskId` + a page that loads the task's inspection and renders it **locked** (no editable inputs) — stock/sampling/temp, full Step-1 checklist, Step-2 result, defect reasons, photos — with a 🔒 "read-only" banner and a **Cetak Quality Receipt** button.

**Print receipt:** the Cetak button (card and read-only view) opens the **existing** `ReceiptPage` for that task's inspection (which already provides the PDF). Ensure `ReceiptPage` can be reached with the task/inspection id from the inbox.

**Verify:** Done filter works; Done tasks can't be re-processed but open a read-only view; Print/Cetak opens the Quality Receipt PDF; Pending/In-Progress flow unchanged.

---

## Notes
- Keep formulas in `lib/rules.ts` and Supabase calls in `data/queries.ts`; reuse `prototype.css` classes.
- Each PR: `pnpm test` + `pnpm build` must pass. Reference the matching mockup screen for exact columns/labels/copy.
