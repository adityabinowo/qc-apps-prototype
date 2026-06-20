# Contributing to QC Apps

Welcome! This document covers everything you need to add a screen, fix a bug, or extend a business rule.

---

## Local setup

```bash
pnpm install
cp .env.example .env          # fill in Supabase URL + anon key
pnpm dev                      # http://localhost:5173
```

Run the seed once after setting up Supabase so demo data exists:

```ts
// In browser console after signing in:
import { seed } from './src/data/seed'
seed()
```

Or run it from `src/main.tsx` temporarily (remove before committing).

---

## Branching

```
main                         # always deployable
feature/<short-name>         # your work branch
```

- One PR per screen or feature.
- PR into `main`. Title: imperative, ≤70 chars (`Add task deadline validation`).
- PRs get a Vercel preview URL automatically.

---

## Where to put things

| What | Where |
|---|---|
| New screen | `src/features/<name>/<Name>Page.tsx` |
| New business rule / formula | `src/lib/rules.ts` + a Vitest test |
| New Supabase query | `src/data/queries.ts` |
| New table or column | `supabase/schema.sql` + `src/data/seed.ts` + `src/lib/types.ts` |
| Shared UI widget | `src/components/` |

**Never put business logic in a page component.** Pages read inputs, call lib/data, and render.

---

## Code style

Mirrors `astro-app-web-admin`:

- No semicolons, single quotes, 100-char line width.
- Types: PascalCase + `Interface` / `Type` / `Enum` suffix (`TaskInterface`, `RoleType`).
- No comments that describe *what* the code does — only *why* if non-obvious.
- ESLint + TypeScript strict mode. `pnpm build` must pass before merge.

---

## Prototype fidelity

The prototype CSS (`src/styles/prototype.css`) is the source of truth for visual design.

- **Reuse existing class names** from the prototype (`.btn-primary`, `.lab.green`, `.tbl`, etc.).
- Do **not** add new CSS classes for prototype screens — map JSX props to existing classes.
- The convergence goal: a later milestone can swap `prototype.css` for real `@astronautsid/wpe-astro-ui` components without restructuring.

---

## Quality gate

Both must pass before opening a PR:

```bash
pnpm test       # Vitest — all rules must be covered
pnpm build      # TypeScript + Vite build — zero errors
```

- Write a Vitest test for every function added to `src/lib/rules.ts`.
- Keep `pnpm test` green — don't merge a red test.

---

## PR checklist

- [ ] `pnpm test` passes
- [ ] `pnpm build` passes (no TS errors)
- [ ] New rules have Vitest tests
- [ ] New tables/columns updated in `schema.sql`, `seed.ts`, `types.ts`
- [ ] UI matches the HTML prototype (`qc-apps-html-prototype/index.html`)
- [ ] No business logic inside page components
- [ ] No `.env` committed

---

## Comments

Reference prototype labels and PRD requirement IDs so reviewers can trace each feature:

```tsx
// PRD §Officer-3 — sampling qty = min(ceil(coverage% × SOH), SOH)
const qty = samplingQty(task.coverage_pct, stock.soh)
```

---

## Getting help

- Check `plan.md` for architecture decisions and the milestone breakdown.
- Check `src/lib/rules.ts` for business logic.
- Open an issue or ping on Slack if something is unclear.
