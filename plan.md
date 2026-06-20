# plan.md — QC Apps MVP, React build (for Claude Code)

Build a working web app of the **MVP QA Apps** PRD that **looks exactly like `qc-apps-html-prototype/index.html`**, that peers contribute to via GitHub, and that deploys for free. Stack: **Vite + React + TypeScript**, **Supabase** (Postgres + Storage) for shared data, **Vercel** for hosting.

**Why this stack:** the prototype is already HTML/CSS, so it ports into React 1:1 (we reuse the stylesheet verbatim). It's the **same paradigm as the real `astro-app-web-admin`** (React + TS), so this work converges with the production app instead of being a throwaway — and later we can swap our hand-CSS for the real `@astronautsid/wpe-astro-ui` components with no architecture change.

**Source of truth:** the PRD (`PRD - MVP QA Apps with Vibe Coding`) and `qc-apps-html-prototype/index.html`. When in doubt, match the prototype.

---

## 0. Decisions already made (do not re-ask)

| Topic | Decision | Consequence |
|---|---|---|
| **Framework** | Vite + React + TypeScript | Prototype markup → JSX components; reuse prototype CSS as-is for exact look. |
| **Data + storage** | **Supabase** (Postgres + Storage) | Real, durable, shared data across peers (fixes the SQLite-reset problem). Photos go in a Storage bucket. |
| **Auth** | **Mock** for v1 — role + hub picker stored in app state | Real WIMS/Supabase Auth is out of scope for the prototype. Flag below. |
| **Mobile officer UI** | Responsive React pages | Same components, phone-width layout. No native camera/offline/push. Barcode scan → **SKU dropdown** ("simulate scan"). |
| **Scope** | Full **Phase 1 + Phase 2** | Includes Master Leveling + Priority Generator. Build in milestone order so there's a usable app early. |
| **Fidelity** | **Exact** — reuse the prototype stylesheet | The prototype CSS becomes the app's global CSS; screens match pixel-for-pixel. |

---

## 1. Things to know / limitations (no action needed, just don't fake them)

1. **Supabase setup is required** (one-time, ~5 min): create a project, copy the Project URL + anon key into `.env` and into Vercel env vars. The plan assumes this exists.
2. **Security for the prototype.** With the anon key and Row Level Security (RLS) relaxed, anyone with the URL + key can read/write. That's acceptable for an **internal** demo. ⚠ Before anything real, turn on RLS and proper Supabase Auth. Keep the anon key in env vars, never hardcoded.
3. **Auth is mocked.** Login is a role (`Officer` / `SPV` / `PX`) + hub picker that sets app state. No passwords. The prototype's login screen stays as the visual entry point.
4. **No real WIMS, barcode scan, offline, or push.** "Stock pull" reads a seeded `stock` table; "WIMS write" updates `stock.stock_status`; notifications are on-screen badges/banners; SLA timers are computed from timestamps. Scan = dropdown. (A real camera scan via `html5-qrcode` is an easy future add — not v1.)
5. **Photos:** upload to a Supabase Storage bucket (`inspection-photos`), compress client-side to < 1 MB (browser canvas) per the PRD rule, store the public URL on the row.
6. **PDF Quality Receipt:** generate client-side with `jspdf` (or `pdf-lib`) from the inspection data; offer download.
7. **Realtime dashboard** (prototype says auto-refresh ≤ 5 min): use a simple refetch interval or a manual Refresh button. Supabase realtime subscriptions are optional polish, not required.

If you hit a limitation not listed here, stop and surface it rather than inventing a workaround.

---

## 2. Tech stack

- **Vite + React 18 + TypeScript**, **React Router** (maps the prototype's left-rail screens to routes).
- **@supabase/supabase-js** (DB + Storage). **@tanstack/react-query** for data fetching/caching (keeps pages clean; optional but recommended).
- **jspdf** (receipt), browser canvas (image compression).
- The **prototype's CSS** moved into `src/styles/prototype.css` and imported globally — this is what makes it look identical.
- Pin versions in `package.json`. Node 18+. Package manager: **pnpm** (matches `astro-app-web-admin`).

---

## 3. Repository structure

```
qc-apps-web/
├── index.html                  # Vite entry
├── src/
│   ├── main.tsx                # bootstraps React, QueryClient, Supabase
│   ├── App.tsx                 # layout: left rail (from prototype) + <Routes>
│   ├── styles/
│   │   └── prototype.css       # the prototype stylesheet, verbatim (the exact-UI source)
│   ├── lib/
│   │   ├── supabase.ts         # client from env vars
│   │   ├── rules.ts            # sampling, %NC, decision matrix, compliance, risk, lifecycle
│   │   ├── types.ts            # TS types (PascalCase + Interface/Type suffix, per astro repo)
│   │   └── config.ts           # editable thresholds (decision bands, verif sample %)
│   ├── data/
│   │   ├── queries.ts          # all Supabase reads/writes (the one place pages call)
│   │   └── seed.ts             # idempotent demo seed (hubs, users, 10 SKUs, tasks…)
│   ├── components/             # shared bits ported from prototype
│   │   ├── Rail.tsx  Topbar.tsx  StatusChip.tsx  Modal.tsx  DataTable.tsx  PhoneFrame.tsx
│   ├── features/               # one folder per screen (mirrors astro-app-web-admin/src/features)
│   │   ├── auth/LoginPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── statusFlow/StatusFlowPage.tsx        # embeds the prototype SVG
│   │   ├── tasks/TaskManagementPage.tsx
│   │   ├── approval/ApprovalQueuePage.tsx
│   │   ├── verification/SpvVerificationPage.tsx
│   │   ├── history/ChangeHistoryPage.tsx
│   │   ├── leveling/MasterLevelingPage.tsx      # Phase 2
│   │   ├── generator/PriorityGeneratorPage.tsx  # Phase 2
│   │   └── officer/                             # responsive mobile flow
│   │       ├── InboxPage.tsx  StockPage.tsx  InspectionWizard.tsx  ResultPage.tsx  ReceiptPage.tsx
│   ├── lib/pdf.ts              # buildQualityReceipt(inspection) -> Blob
│   └── lib/image.ts           # compressToUnder1MB(file) -> Blob
├── supabase/
│   └── schema.sql             # tables (run in Supabase SQL editor); RLS notes
├── .env.example               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .gitignore                 # .env, node_modules, dist
├── CONTRIBUTING.md            # how peers run/add a screen/branch (see §8)
└── README.md
```

**Contributor rule:** business logic lives only in `src/lib/rules.ts` and data access only in `src/data/queries.ts`. `features/*` pages are thin — read inputs, call lib/data, render. This keeps formulas in one tested place and lets people add screens without touching logic.

**Porting the prototype:** copy the `<style>` block from `index.html` into `prototype.css` unchanged. Each prototype `<section class="admin" id="...">` / `<div class="mobilewrap">` becomes one page component using the same class names, so it renders identically. The inline `go()`/modal JS becomes React Router navigation + a `<Modal>` component.

---

## 4. Data model — Supabase Postgres (`supabase/schema.sql`)

Same shape as the prototype's mock data. Seed via `data/seed.ts` (idempotent: insert only if empty).

- **hubs**(id, name, location)
- **users**(id, name, email, role `officer|spv|px`, hub_id)
- **stock**(sku_id pk, name, product_id, category `Fresh|Frozen|Dry`, sloc, soh, msltc, last_ed, stock_status `Available|Bad`)  ← mock WIMS
- **master_leveling**(sku_id pk, name, product_id, category, risk_score, priority `Low|Medium|High`, level `LV1|LV2|LV3`, coverage_pct, manual_flag, updated_at, updated_by)
- **leveling_changelog**(id, sku_id, field, old, new, actor, ts)
- **priority_list**(id, week, sku_id, params_met, risk_score, priority, level, status `Pending|Done`, generated_at)
- **tasks**(id, sku_id, hub_id, officer_id null=any, priority, level, coverage_pct, deadline, instructions, status `Pending|In Progress|Done|Overdue`, created_by, created_at)
- **inspections**(id, task_id, sku_id, officer_id, hub_id, soh, sampling_qty, product_temp, prod_date, exp_date, qty_good, qty_bad, total_defect, defect_reasons, defect_desc, nc_pct, decision, recommended_action, proposed_status, **lifecycle_state**, created_at)
- **inspection_photos**(id, inspection_id, url, is_defect)  ← url points to Storage bucket
- **status_changes**(id, inspection_id, sku_id, hub_id, old_status, new_status, state `Pending|Approved|Rejected`, reason, source `inspection|verification`, submitted_at, decided_by, decided_at)
- **verifications**(id, inspection_id, spv_id, officer_id, qty_checked, sample_qty, good_qty, match_flag, severity, defect_type, defect_qty, wastage_reason, compliance_pct, band `PASSED|PASSED_WITH_NOTE|NOT_PASSED`, created_at)
- **audit_log**(id, entity, entity_id, action, payload jsonb, actor, ts)  ← append-only
- **config**(key pk, value)  ← thresholds, so they're not hardcoded

RLS: for the prototype, leave permissive (or off) with the anon key; document in `schema.sql` that production must enable RLS + Auth.

---

## 5. Business rules (`src/lib/rules.ts`) — single source of truth

Pure functions, all unit-tested (Vitest). Read thresholds from `config`, never inline.

- `samplingQty(coveragePct, soh)` → `min(ceil(coveragePct/100 * soh), soh)` (full inspection if sample ≥ SOH).
- `nonConformityPct(totalDefect, samplingQty)` → `totalDefect / samplingQty * 100` (guard /0).
- `decide(ncPct, config)` → `{ band, recommendedAction, proposesStatusChange }`: 0–5% Accepted (no change), 6–20% Conditionally Accepted (sort then submit found-bad → change), >20% Quarantine All (change). Bands from config.
- `compliance(goodQty, qtyChecked)` → `{ pct, band, action }`: >95 PASSED/continue, 75–95 PASSED_WITH_NOTE/recheck, <75 NOT_PASSED/full re-inspection.
- `verificationSampleQty(qtyChecked, pct = config.verifSamplePct ?? 20)`.
- `riskPriority(paramsMet)` → Low 1–2 / Medium 3–4 / High >4.

### Lifecycle state machine (the agreed status-flow)

`inspections.lifecycle_state` + `status_changes.state`. **Branch first on "is there a status change vs WMS?"** — Approval and Verification are different lanes, not alternatives.

```
SUBMITTED
  ├─ Accepted (no change)            → COMPLETED              (no WMS write)
  ├─ Conditionally Accepted          → PENDING_SORT → (bad units) → PENDING_APPROVAL
  └─ Quarantine All                  → PENDING_APPROVAL
PENDING_APPROVAL → APPROVED → WMS_WRITTEN   (only point stock.stock_status changes)
                 └ REJECTED  (unchanged, reason logged)

Verification (separate, sampled, async — audits the officer):
  SELECTED → RE-INSPECTED → MATCH       (close; update officer compliance)
                          └ MISMATCH    (quarantine + wastage; creates a NEW
                                         status_change → PENDING_APPROVAL)
```

Encode allowed transitions as `nextStates(state)` so pages can't set illegal states. On mismatch, **SPV result supersedes** the officer. Every approve/reject/write appends to `audit_log`.

---

## 6. Look & feel

- Import `prototype.css` once in `main.tsx`. Reuse the exact class names from the prototype so every screen matches.
- `StatusChip`, `Modal`, `DataTable`, `Rail`, `Topbar`, `PhoneFrame` wrap the prototype's repeated patterns so pages stay short.
- Officer pages render inside the prototype's phone-frame look on desktop and go full-width on a real phone (media query).
- `StatusFlowPage` embeds the prototype's `<svg>` diagram (move it to `assets/status-flow.svg`).
- **Convergence note:** because this mirrors `astro-app-web-admin`'s `features/` layout and TS naming, a later milestone can replace `prototype.css` widgets with real `@astronautsid/wpe-astro-ui` components screen-by-screen without restructuring.

---

## 7. Build milestones (one Claude Code session / PR each, in order)

- **M0 — Scaffold.** Vite+React+TS, pnpm, React Router, Supabase client, `prototype.css`, `schema.sql`, `seed.ts`, `Rail`/`Topbar`, mock login (role+hub). App runs, left rail navigates, Dashboard empty.
- **M1 — Master Leveling + Priority Generator** (Phase 2 data spine). CRUD + changelog (LV1 default), generator (mock upload, score 6 params, graceful skip + log, Manual always included). Feeds tasks.
- **M2 — Task Management (SPV).** Create/assign (hub, officer optional, deadline default today 18:00, priority, instructions ≤500), auto-Overdue, auto daily list queued for review.
- **M3 — Officer flow.** Inbox (deadline sort, chips, filter, count) → Stock (from `stock`, SKU dropdown = scan, auto sampling) → InspectionWizard: **Step 1** general/storage with **early-stop → Quarantine now**, **Step 2** inspect item (temp, dates, good/bad with `good+bad=sampling` validation, defect multiselect, photo upload→compress→Storage) → Result (auto %NC + decision, set lifecycle_state) → Receipt PDF.
- **M4 — Approval Queue + WMS write + history.** Queue of pending `status_changes` (compare WMS vs reported, photos, notes), Approve → write `stock.stock_status` + audit, Reject → reason + audit. SLA age from timestamps. Change History + CSV/Excel export.
- **M5 — SPV Verification.** Pick a completed inspection, sample = 20% of qty checked, match/mismatch (+severity/defect/wastage on mismatch), compliance band per officer; mismatch → new `status_changes` → Approval Queue.
- **M6 — Dashboard + Status Flow + exports.** KPIs, lifecycle count strip (8 states), per-hub cards, result summary, export; embed the status-flow SVG with the "two lanes" explanation.

Starter prompt per milestone:
> *"Read plan.md §3–7 and the matching screen in qc-apps-html-prototype/index.html. Implement milestone M3. Reuse prototype.css class names for an exact match, keep all formulas in src/lib/rules.ts, all Supabase calls in src/data/queries.ts, compress photos before upload to the inspection-photos bucket. Add Vitest tests for any rules touched. Run `pnpm dev` and `pnpm test` before finishing."*

---

## 8. Collaboration workflow (peers via GitHub)

- **Repo** (private to start). `README.md` quickstart; `CONTRIBUTING.md` = rules below.
- **Run locally:** `pnpm install` → copy `.env.example` to `.env` and fill Supabase keys → `pnpm dev`.
- **Branching:** feature branches → PR into `main`. ~one screen/feature per PR. `.gitignore` covers `.env`, `node_modules`, `dist`.
- **Where to add things:** new screen → `src/features/<name>/`; new rule → `src/lib/rules.ts` + a test; new table/column → `supabase/schema.sql` + `seed.ts` + `types.ts`. Never put logic in a page.
- **Quality gate:** `pnpm test` (Vitest) and `pnpm build` must pass before merge. Optional: ESLint/Prettier mirroring `astro-app-web-admin` (no semicolons, single quotes, 100-char width; types PascalCase + `Interface/Type/Enum` suffix).
- **Comments** reference prototype labels + PRD requirement IDs so reviewers can trace each feature.

---

## 9. Deploy (Vercel + Supabase)

1. Create the Supabase project; run `supabase/schema.sql` in its SQL editor; create the `inspection-photos` Storage bucket (public for the prototype).
2. Push the repo to GitHub.
3. Vercel → New Project → import the repo → framework auto-detected (Vite) → add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Deploy. Every push to `main` auto-deploys; PRs get preview URLs (great for peer review).
4. Data is durable in Supabase (no reset problem). Still add an Export button as a convenience.

---

## 10. Definition of done (v1)

A peer opens the Vercel URL, picks a role+hub, and: PX maintains leveling + runs the generator; SPV creates tasks, approves/rejects WMS changes, verifies officers, reads the dashboard; an Officer completes an inspection end-to-end and downloads a Quality Receipt — every screen matches the prototype, every formula in `rules.ts` is covered by passing tests, lifecycle states match the status-flow diagram, and data persists in Supabase across sessions and peers.
