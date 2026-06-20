# QC Apps — MVP Web Prototype

Quality inspection workflow for Astro hubs. Officers inspect stock SKUs on mobile; SPVs manage tasks, approve WMS changes, and run verifications; PX Quality maintains master leveling and priority lists.

**Stack:** Vite + React 18 + TypeScript · pnpm · React Router v6 · @tanstack/react-query · Supabase (Postgres + Storage) · jsPDF · Vercel

**Live demo:** [qc-apps-prototype.vercel.app](https://qc-apps-prototype.vercel.app) *(mock auth, no password needed)*

---

## Quickstart

### 1 — Clone and install

```bash
git clone https://github.com/adityabinowo/qc-apps-prototype.git
cd qc-apps-prototype
pnpm install
```

### 2 — Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query** → paste and run `supabase/schema.sql` (creates all 10 tables).
3. **SQL Editor → New query** → paste and run the seed block below.
4. **Storage → New bucket** → name `inspection-photos`, Public: **on**.
5. Copy `.env.example` to `.env` and fill in your project URL and anon key:

```bash
cp .env.example .env
# values at Supabase Dashboard > Settings > API
```

#### Seed data

```sql
INSERT INTO hubs (id, name, location) VALUES
  ('hub-kemang',   'Hub Kemang',   'South Jakarta'),
  ('hub-tebet',    'Hub Tebet',    'South Jakarta'),
  ('hub-pancoran', 'Hub Pancoran', 'South Jakarta')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, name, email, role, hub_id) VALUES
  ('user-spv-1',     'Rina N', 'spv.quality@astronauts.id',  'spv',     'hub-kemang'),
  ('user-px-1',      'Budi K', 'px.quality@astronauts.id',   'px',      'hub-kemang'),
  ('user-officer-1', 'Dani A', 'officer1@astronauts.id',     'officer', 'hub-kemang'),
  ('user-officer-2', 'Sari W', 'officer2@astronauts.id',     'officer', 'hub-tebet')
ON CONFLICT DO NOTHING;

INSERT INTO stock (sku_id, name, product_id, category, sloc, soh, msltc, last_ed, stock_status) VALUES
  ('SKU-001', 'Ayam Potong 1kg',    'PRD-001', 'Fresh',  'SL01', 120, 3,  '2026-06-25', 'Available'),
  ('SKU-002', 'Ikan Salmon 500g',   'PRD-002', 'Fresh',  'SL02',  80, 5,  '2026-06-24', 'Available'),
  ('SKU-003', 'Nugget Ayam 400g',   'PRD-003', 'Frozen', 'SL03', 200, 7,  '2027-01-15', 'Available'),
  ('SKU-004', 'Es Krim Vanilla 1L', 'PRD-004', 'Frozen', 'SL04',  60, 4,  '2026-12-01', 'Available'),
  ('SKU-005', 'Beras Premium 5kg',  'PRD-005', 'Dry',    'SL05', 300, 14, '2027-06-01', 'Available'),
  ('SKU-006', 'Minyak Goreng 2L',   'PRD-006', 'Dry',    'SL06', 150, 30, '2027-03-01', 'Available')
ON CONFLICT DO NOTHING;

INSERT INTO master_leveling (sku_id, name, product_id, category, risk_score, priority, level, coverage_pct, manual_flag, updated_at, updated_by) VALUES
  ('SKU-001', 'Ayam Potong 1kg',    'PRD-001', 'Fresh',  5, 'High',   'LV3', 70, false, NOW(), 'user-px-1'),
  ('SKU-002', 'Ikan Salmon 500g',   'PRD-002', 'Fresh',  4, 'Medium', 'LV2', 50, false, NOW(), 'user-px-1'),
  ('SKU-003', 'Nugget Ayam 400g',   'PRD-003', 'Frozen', 3, 'Medium', 'LV2', 50, false, NOW(), 'user-px-1'),
  ('SKU-004', 'Es Krim Vanilla 1L', 'PRD-004', 'Frozen', 2, 'Low',    'LV1', 20, false, NOW(), 'user-px-1'),
  ('SKU-005', 'Beras Premium 5kg',  'PRD-005', 'Dry',    1, 'Low',    'LV1', 20, false, NOW(), 'user-px-1'),
  ('SKU-006', 'Minyak Goreng 2L',   'PRD-006', 'Dry',    1, 'Low',    'LV1', 20, false, NOW(), 'user-px-1')
ON CONFLICT DO NOTHING;
```

### 3 — Run locally

```bash
pnpm dev        # dev server → http://localhost:5173
pnpm exec vitest run   # run 22 Vitest unit tests
pnpm build      # production build (TypeScript-checked)
```

> **No Supabase keys?** The app boots with a console warning and mock login still works. Data writes will fail until you add the keys.

---

## Login (mock auth)

Select a **role** and **hub** — no password needed.

| Role | Default user | Access |
|---|---|---|
| **SPV QA** | Rina N · Hub Kemang | Dashboard, Task Management, Approval Queue, Verification, Change History |
| **PX Quality** | Budi K · Hub Kemang | All SPV screens + Master SKU Leveling, Priority Generator |
| **QA Officer** | Dani A · Hub Kemang | Mobile officer flow (Inbox → Stock → Step 1 → Step 2 → Result → Receipt) |

---

## Milestones

| # | Scope | Status |
|---|---|---|
| M0 | Scaffold — Vite+React+TS, nav, mock auth, empty dashboard | ✅ Done |
| M1 | Master SKU Leveling (CRUD + changelog) · Priority Generator (6-param scoring) | ✅ Done |
| M2 | Task Management — create/assign, level→coverage auto-fill, overdue detection | ✅ Done |
| M3 | Officer inspection flow — Inbox, Stock, Step 1+2, Result, Receipt + photo upload + PDF | ✅ Done |
| M4 | Approval Queue (WIMS write simulation, SLA timer) · Change History (CSV export) | ✅ Done |
| M5 | SPV Verification — 20% re-sample, compliance bands, mismatch → approval queue | ✅ Done |
| M6 | Live Dashboard (KPIs, per-hub progress, lifecycle counts) · Status Flow diagram | ✅ Done |

---

## How it works

### Decision bands (configurable in `src/lib/config.ts`)

| Band | % Non-Conformity | Action |
|---|---|---|
| **Accepted** | 0–5% | No WMS change. Lifecycle → `COMPLETED`. |
| **Conditionally Accepted** | 6–20% | 1:1 sort bad units. Lifecycle → `PENDING_SORT`. |
| **Quarantine All** | > 20% or early stop | Full batch quarantine. Lifecycle → `PENDING_APPROVAL`. |

### Inspection lifecycle

```
SUBMITTED → COMPLETED (Accepted)
          → PENDING_SORT → PENDING_APPROVAL (Cond. Accepted, after sort)
          → PENDING_APPROVAL (Quarantine All)
                         → APPROVED → WMS_WRITTEN
                         → REJECTED
```

**Verification lane (independent):** SPV re-checks completed inspections. 20% re-sample → compliance score. Mismatch creates a new `status_change` routed to the approval queue.

### Sampling formula

```
samplingQty = min(ceil(coverage_pct / 100 × SOH), SOH)
```

Coverage % per level: LV1 = 20%, LV2 = 50%, LV3 = 70%.

---

## Project structure

```
src/
├── styles/prototype.css          # Verbatim copy of prototype CSS — do not modify
├── lib/
│   ├── types.ts                  # All TypeScript interfaces and union types
│   ├── config.ts                 # Decision thresholds, coverage %, risk bands
│   ├── rules.ts                  # Business logic — pure functions, all Vitest-tested
│   ├── image.ts                  # Canvas compression to <1MB before Storage upload
│   ├── pdf.ts                    # jsPDF quality receipt generator
│   └── supabase.ts               # Supabase client (reads VITE_SUPABASE_* env vars)
├── data/
│   └── queries.ts                # All Supabase reads/writes (no logic here)
├── components/                   # Rail, Topbar, Modal, DataTable, StatusChip, PhoneFrame
├── context/AuthContext.tsx       # Mock auth state (role + hub in React context)
└── features/
    ├── auth/LoginPage.tsx
    ├── dashboard/DashboardPage.tsx
    ├── statusFlow/StatusFlowPage.tsx
    ├── tasks/TaskManagementPage.tsx
    ├── approval/ApprovalQueuePage.tsx
    ├── verification/SpvVerificationPage.tsx
    ├── history/ChangeHistoryPage.tsx
    ├── leveling/MasterLevelingPage.tsx
    ├── generator/PriorityGeneratorPage.tsx
    └── officer/
        ├── InboxPage.tsx
        ├── StockPage.tsx
        ├── InspectionStep1Page.tsx
        ├── InspectionStep2Page.tsx
        ├── ResultPage.tsx
        └── ReceiptPage.tsx

supabase/schema.sql               # Run once in Supabase SQL editor (10 tables)
docs/test-scenarios.md            # 31 E2E test scenarios + 8 gap analyses
docs/superpowers/plans/           # Implementation plans per milestone
```

**Contributor rule:** business logic → `src/lib/rules.ts` · data access → `src/data/queries.ts` · feature pages are thin wrappers.

---

## Tests

```bash
pnpm exec vitest run
```

22 unit tests in `src/lib/rules.test.ts` cover every business-logic function: `samplingQty`, `nonConformityPct`, `decide`, `compliance`, `verificationSampleQty`, `riskPriority`, `coverageForLevel`, `nextStates`.

End-to-end manual test scenarios are in [`docs/test-scenarios.md`](docs/test-scenarios.md) (31 scenarios across PX, SPV, and Officer roles, plus 8 documented gap analyses).

---

## Deploy to Vercel

The repo is connected to Vercel. Every merge to `main` auto-deploys.

```bash
# Manual deploy:
# 1. Push branch to GitHub
# 2. Import at vercel.com → New Project → select repo → Framework: Vite
# 3. Add env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# 4. Deploy — PRs get preview URLs automatically
```

---

## Security notes

- The Supabase anon key is safe to expose in frontend code (Supabase design), but keep it in `.env` — never hardcode it.
- RLS is **disabled** for the prototype. Enable RLS and real Supabase Auth before any production use.
- The `inspection-photos` bucket is public for the prototype — restrict it in production.
- See `supabase/schema.sql` for the full RLS reminder.
