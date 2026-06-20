# QC Apps — MVP Web Prototype

Quality inspection workflow for Astro hubs. Officers inspect stock SKUs on mobile; SPVs manage tasks, approve WMS changes, and run verifications; PX maintains master leveling.

**Stack:** Vite + React 18 + TypeScript · pnpm · Supabase (Postgres + Storage) · Vercel

---

## Quickstart

### 1 — Clone and install

```bash
git clone <repo-url> qc-apps-prototype
cd qc-apps-prototype
pnpm install
```

### 2 — Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In **SQL Editor → New query**, paste and run `supabase/schema.sql`.
3. In **Storage → New bucket**, create `inspection-photos` (Public: on — for the prototype only).
4. Copy `.env.example` to `.env` and fill in your project URL and anon key:

```bash
cp .env.example .env
# then edit .env with your values from Supabase Dashboard > Settings > API
```

### 3 — Run locally

```bash
pnpm dev        # dev server at http://localhost:5173
pnpm test       # run Vitest unit tests
pnpm build      # production build (TypeScript-checked)
```

> **No Supabase keys?** The app boots with a console warning and login still works (mock auth is local).
> Data writes will fail until you add the keys.

---

## Login (mock auth)

Select a **role** and **hub** — no password needed. Roles:

| Role | Access |
|---|---|
| **SPV QA** | Dashboard, tasks, approval queue, verification, history |
| **PX Quality** | All SPV screens + master leveling, priority generator |
| **QA Officer** | Mobile officer flow (inbox → stock → inspection → receipt) |

---

## Project structure

```
src/
├── styles/prototype.css     # Verbatim copy of prototype CSS — do not modify
├── lib/
│   ├── types.ts             # All TypeScript types (PascalCase + Interface/Type suffix)
│   ├── config.ts            # Editable thresholds (decision bands, coverage %, etc.)
│   ├── rules.ts             # Business logic — pure functions, Vitest-tested
│   └── supabase.ts          # Supabase client (reads VITE_SUPABASE_* env vars)
├── data/
│   ├── queries.ts           # All Supabase reads/writes
│   └── seed.ts              # Idempotent demo data seeder
├── components/              # Shared UI (Rail, Topbar, Modal, DataTable, StatusChip, PhoneFrame)
├── context/AuthContext.tsx  # Mock auth state (role + hub in React context)
└── features/                # One folder per screen
    ├── auth/LoginPage.tsx
    ├── dashboard/DashboardPage.tsx
    └── ...                  # Each milestone adds screens here
supabase/schema.sql          # Run once in Supabase SQL editor
```

**Contributor rule:** business logic → `src/lib/rules.ts`; data access → `src/data/queries.ts`; feature pages are thin.

---

## Milestones

| # | Scope | Status |
|---|---|---|
| M0 | Scaffold — nav, auth, empty dashboard | ✅ Done |
| M1 | Master Leveling + Priority Generator | 🔜 Next |
| M2 | Task Management (SPV) | — |
| M3 | Officer inspection flow | — |
| M4 | Approval Queue + WMS write + History | — |
| M5 | SPV Verification | — |
| M6 | Dashboard + Status Flow + exports | — |

---

## Deploy to Vercel

```bash
# 1. Push to GitHub
git push origin main

# 2. Import at vercel.com → New Project → select repo → framework: Vite
# 3. Add env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# 4. Deploy — PRs get preview URLs automatically
```

---

## Security notes

- The anon key is safe to expose in frontend code (by Supabase design), but keep it in env vars — never hardcode it.
- RLS is disabled for the prototype. **Enable RLS and real Supabase Auth before any production use.**
- See `supabase/schema.sql` for the RLS reminder and storage bucket setup.
