# QC Apps — End-to-End Test Scenarios

> Run these manually after seeding Supabase (schema.sql + seed data). Each scenario lists: **role**, **steps**, **expected result**, and **assertion**.

---

## T-AUTH — Authentication

### T-AUTH-1 Officer login routes to inbox
- **Role:** Officer
- **Steps:** Open app → Select role=QA Officer → Select user=Dani A → Hub=Hub Kemang → Sign In
- **Expected:** Redirected to `/app/officer/inbox`, Task Inbox header visible
- **Assert:** No blank page, no redirect loop

### T-AUTH-2 SPV login routes to dashboard
- **Role:** SPV
- **Steps:** Login as SPV QA / Rina N / Hub Kemang
- **Expected:** Redirected to `/app/dashboard`, Monitoring Dashboard visible

### T-AUTH-3 PX login routes to dashboard
- **Role:** PX
- **Steps:** Login as PX Quality / Budi K / Hub Kemang
- **Expected:** Dashboard visible, Phase 2 nav (Master SKU Leveling, Priority Generator) also visible

### T-AUTH-4 Sign out
- **Role:** Any
- **Steps:** Click Sign Out in Rail
- **Expected:** Redirected to login page, all app routes require re-login

---

## T-M1 — Master SKU Leveling + Priority Generator

### T-M1-1 View leveling table
- **Role:** PX
- **Steps:** Navigate to Master SKU Leveling
- **Expected:** Table shows seeded SKUs with level/coverage/priority

### T-M1-2 Add new SKU
- **Role:** PX
- **Steps:** Click "＋ Add SKU" → Fill SKU ID, Name, Category=Fresh, Risk Score=5 → Save
- **Expected:** New row appears with Level=LV3, Coverage=70%, Priority=High
- **Assert:** `levelFromScore(5)=LV3`, `coverageForLevel('LV3')=70`

### T-M1-3 Edit SKU — auto level computation
- **Role:** PX
- **Steps:** Edit an existing SKU → Change Risk Score from 3 to 2 → verify Level changes to LV1
- **Expected:** Level auto-updates to LV1, Coverage changes to 20% (manual_flag=false)

### T-M1-4 Manual override locks level
- **Role:** PX
- **Steps:** Edit a SKU → Check "Manual override" → Change level to LV3 → Set Risk Score to 1 → Save
- **Expected:** Level stays LV3 (not overridden by score), manual_flag=true in DB

### T-M1-5 Generate priority list
- **Role:** PX
- **Steps:** Navigate to Priority Generator → Check 2 params for SKU A, 5 params for SKU B → Click Generate
- **Expected:** Preview shows SKU A=Medium (2 params), SKU B=High (≥5 params)
- **Assert:** `riskPriority(2)=Medium`, `riskPriority(5)=High`

### T-M1-6 Save priority list persists to DB
- **Role:** PX
- **Steps:** After T-M1-5 preview → Click "Save Priority List"
- **Expected:** List appears in "Saved list for [week]" section below the generator

---

## T-M2 — Task Management

### T-M2-1 Create task — default coverage matches level
- **Role:** SPV
- **Steps:** Navigate to Task Management → Create Task → SKU=any → Level=LV2 → Create
- **Expected:** Task created with coverage_pct=50 (matches LV2 config)
- **Assert:** `coverageForLevel('LV2')=50`

### T-M2-2 Overdue detection
- **Role:** SPV
- **Steps:** Create a task with deadline set to 1 hour ago → Reload task list
- **Expected:** Task shows status=Overdue (red badge)
- **Assert:** Client-side overdue detection fires on re-fetch

### T-M2-3 Assign to officer filters Inbox
- **Role:** SPV then Officer
- **Steps:** Create task assigned to officer Dani A → Login as Dani A → Check Inbox
- **Expected:** Task appears in Dani A's inbox; does NOT appear for Sari W (different officer)

### T-M2-4 Unassigned task visible to all officers in hub
- **Role:** SPV then Officer
- **Steps:** Create task with officer=blank → Login as any officer in same hub
- **Expected:** Task visible in any officer's inbox

---

## T-M3 — Officer Inspection Flow

### T-M3-1 Open task → see sampling target
- **Role:** Officer
- **Steps:** Click a Pending task in Inbox → Navigate to Stock screen
- **Expected:** Sampling target = `ceil(coverage_pct / 100 * soh)` shown prominently
- **Assert:** SOH=100, LV1 → target=20; SOH=7, LV1 → target=2 (ceil(1.4))

### T-M3-2 Normal inspection — Accepted path
- **Role:** Officer
- **Steps:** Step 1: temp=4.5, condition=Suhu OK → Step 2: good=18, bad=2 (20 total, 2/20=10% NC) → Submit
- **Expected:** Decision=Conditionally Accepted (6–20%), lifecycle→PENDING_SORT, status_change row created
- **Assert:** `nonConformityPct(2,20)=10`, `decide(10).band='Conditionally Accepted'`

### T-M3-3 Zero NC → Accepted
- **Role:** Officer
- **Steps:** Step 2: good=20, bad=0 (0% NC)
- **Expected:** Decision=Accepted, lifecycle→COMPLETED, no status_change created
- **Assert:** `decide(0).band='Accepted'`, `proposesStatusChange=false`

### T-M3-4 High NC → Quarantine All
- **Role:** Officer
- **Steps:** Step 2: good=14, bad=6 (30% NC)
- **Expected:** Decision=Quarantine All, lifecycle→PENDING_APPROVAL, status_change Pending in DB
- **Assert:** `decide(30).band='Quarantine All'`

### T-M3-5 Early stop path
- **Role:** Officer
- **Steps:** Step 1: Check "Early stop" → Provide reason → Step 2: Submit (qty validated as sampleQty all bad)
- **Expected:** NC=100%, Decision=Quarantine All, status_change created

### T-M3-6 Photo upload compression
- **Role:** Officer
- **Steps:** Add a photo >1MB → Submit inspection
- **Expected:** Photo appears in inspection_photos table (Supabase Storage), no upload error
- **Assert:** Compressed blob size ≤ 900KB before upload

### T-M3-7 Quality Receipt download
- **Role:** Officer
- **Steps:** After inspection → Result screen → "View & Download Receipt" → Download PDF
- **Expected:** PDF opens/downloads, contains SKU name, decision, %NC, date
- **Assert:** buildQualityReceipt() returns a non-null Blob

---

## T-M4 — Approval Queue + Change History

### T-M4-1 Pending approval appears in queue
- **Role:** SPV (after T-M3-4)
- **Steps:** Login as SPV → Navigate to Approval Queue
- **Expected:** The Quarantine All inspection from T-M3-4 appears in pending queue

### T-M4-2 SLA timer
- **Role:** SPV
- **Steps:** Wait 6 min without acting on a pending approval
- **Expected:** Age badge turns yellow (>5 min); turns red at >15 min

### T-M4-3 Approve → WIMS write
- **Role:** SPV
- **Steps:** Select item → Click "Approve & Write to WIMS"
- **Expected:** status_changes row → state=Approved, stock.stock_status updated to Bad, entry in Change History

### T-M4-4 Reject with reason
- **Role:** SPV
- **Steps:** Select item → Click Reject → Provide reason → Confirm
- **Expected:** status_changes row → state=Rejected, stock.stock_status unchanged (stays Available)

### T-M4-5 Change History audit trail
- **Role:** SPV
- **Steps:** Navigate to Change History
- **Expected:** Both T-M4-3 (Approved) and T-M4-4 (Rejected) rows visible with timestamp, decided_by

### T-M4-6 CSV export
- **Role:** SPV
- **Steps:** In Change History → Click "Export CSV"
- **Expected:** CSV file downloads with correct columns (Timestamp, SKU, Hub, Old, New, Decision, Decided By)

---

## T-M5 — SPV Verification

### T-M5-1 Completed inspection appears for re-check
- **Role:** SPV (after T-M3-3 Accepted inspection)
- **Steps:** Navigate to SPV Verification
- **Expected:** The COMPLETED inspection from T-M3-3 appears in the left panel

### T-M5-2 Verification sample size
- **Role:** SPV
- **Steps:** Select an inspection where sampling_qty=20
- **Expected:** SPV sample = 4 (20% of 20)
- **Assert:** `verificationSampleQty(20)=4`

### T-M5-3 Match result — PASSED compliance
- **Role:** SPV
- **Steps:** good_qty=4 (of 4 sample), Match → Save
- **Expected:** compliance=100%, band=PASSED, inspection lifecycle→RE_INSPECTED, no new status_change

### T-M5-4 Mismatch → new status_change to queue
- **Role:** SPV
- **Steps:** good_qty=2 (of 4 sample), Mismatch, severity=Major, defect_type=Packaging → Save
- **Expected:** New status_change row created (source=verification), appears in Approval Queue

### T-M5-5 Below-threshold compliance triggers note
- **Role:** SPV
- **Steps:** good_qty=3 (of 4 sample = 75%)
- **Expected:** band=PASSED_WITH_NOTE, action shown
- **Assert:** `compliance(3,4).band='PASSED_WITH_NOTE'` (75% is exactly at noteMin threshold)

---

## T-M6 — Dashboard (Live)

### T-M6-1 KPI cards update after inspections
- **Role:** PX
- **Steps:** After running several inspections → Navigate to Dashboard
- **Expected:** "Inspections today" count > 0, lifecycle flow cells show non-zero counts

### T-M6-2 Per-hub progress bars
- **Role:** PX
- **Steps:** Create tasks for Hub Kemang → Mark some Done
- **Expected:** Hub Kemang bar fills proportionally

### T-M6-3 Over-SLA alert
- **Role:** PX
- **Steps:** Have a pending approval older than 15 min → Check Dashboard
- **Expected:** "Pending WIMS approvals" KPI shows red text, ">0 over SLA" detail

### T-M6-4 Status Flow page renders all states
- **Role:** PX
- **Steps:** Navigate to Inspection Status Flow
- **Expected:** All 7 lifecycle steps and 3 decision bands shown, transitions table complete

---

## T-GAP — Gap Analysis Scenarios

### T-GAP-1 Concurrent approval race condition
- **Scenario:** Two SPVs open the same pending approval simultaneously and both click Approve
- **Expected:** Both calls succeed but result is idempotent (state=Approved, stock updated once)
- **Risk:** Supabase row-level lack of transactions may allow double-write. Mitigation: check `state !== 'Pending'` before `decideStatusChange`
- **Verdict:** Gap — optimistic lock not implemented in prototype. Acceptable for MVP scope.

### T-GAP-2 Officer submits inspection without a task
- **Scenario:** Officer navigates directly to `/app/officer/step1` without selecting a task
- **Expected:** Redirected/warned (no task in location state)
- **Verdict:** Handled — each step guards `if (!state?.task)` with fallback UI

### T-GAP-3 Sampling qty mismatch constraint
- **Scenario:** Officer enters good=15, bad=3 when sampleQty=20 (total=18 ≠ 20)
- **Expected:** Submit button disabled, warning shown
- **Verdict:** Handled — `qtyOk = earlyStop || total === sampleQty` blocks submit

### T-GAP-4 Photo bucket missing
- **Scenario:** Supabase storage bucket `inspection-photos` not created
- **Expected:** Upload fails silently (empty photoUrls), inspection still saves
- **Verdict:** Acceptable for prototype — photo upload errors don't block inspection submit. Log to console.

### T-GAP-5 No seed data — empty dashboard
- **Scenario:** App deployed but schema not run / no seed data inserted
- **Expected:** Dashboard shows zeros, tables show "No records" states
- **Verdict:** Handled — all queries return empty arrays gracefully; no crashes

### T-GAP-6 PriorityList generated for same week twice
- **Scenario:** PX clicks "Generate" for same week twice and saves both
- **Expected:** Two sets of rows inserted, existing saved list shown below
- **Verdict:** Gap — no unique constraint on (week, sku_id) in priority_list. Prototype behaviour: duplicates accumulate. Production fix: add UNIQUE(week, sku_id) + upsert.

### T-GAP-7 SPV verifies an inspection that's already verified
- **Scenario:** SPV selects same inspection twice in verification panel
- **Expected:** Second save creates another verification row (no guard)
- **Verdict:** Partially handled.
  - ✅ Server-side: `fetchCompletedInspections` (`src/data/queries.ts`) whitelists `lifecycle_state IN ('COMPLETED', 'PENDING_SORT', 'PENDING_APPROVAL')`. Once a verification completes and the inspection moves to `RE_INSPECTED`, it drops out of the candidate list.
  - ⚠ Remaining race window: two SPVs (or one SPV double-clicking Save) can both submit before the lifecycle update lands → duplicate `verifications` rows + duplicate `status_changes` on mismatch. Production fix: (a) disable Save while mutation pending using `useMutation`'s `isPending`, and (b) add an idempotency guard in `createVerification` that returns the existing row if one already exists for `inspection_id`.
  - ⚠ Separate state-machine concern: verification transitions `COMPLETED|PENDING_SORT|PENDING_APPROVAL → RE_INSPECTED` directly, but `rules.ts::nextStates()` only allows `SELECTED → RE_INSPECTED`. Tracked separately.

### T-GAP-8 Role visibility: Officer sees admin nav
- **Scenario:** Officer manually navigates to `/app/dashboard`
- **Expected:** Dashboard is rendered (no auth guard per role at the route level)
- **Verdict:** Gap — prototype uses client-side role-based Rail but no route guards. Acceptable for prototype. Production: add role check in ProtectedLayout per route.
