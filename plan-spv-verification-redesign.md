# plan-spv-verification-redesign.md — Split SPV Verification into two evaluations (for Claude Code)

Restructure `src/features/verification/SpvVerificationPage.tsx` so the two things an SPV evaluates are visually and semantically separate — **no data-model or business-logic change**, this is a UI/UX rework of one page (plus its CSS).

**Reviewed prototype:** `spv-verification-redesign.html` (in the workspace root, one level above this repo) — match its layout, copy, and behavior.

## Why
Today one "Re-inspection result" block mixes two unrelated questions, and it never shows the officer's original result to compare against. Split into:
- **Step 1 — Officer accuracy** (judges the *officer*): good units found in the 20% sample → compliance % → PASSED / PASSED_WITH_NOTE / NOT_PASSED. Does **not** change stock.
- **Step 2 — Stock condition** (judges the *stock*): Match / Mismatch vs the officer's call. Mismatch → defect fields → status change to approval. Does **not** re-score the officer.

Confirmed decisions: **accuracy shown first**, the two steps stay **fully independent** (no cross-warnings), and a **Match is still logged** (verification row saved even when nothing changes).

## Layout (stacked, top → bottom), inside the right panel
1. **Header** — SKU name, verification ticket id, `Officer: {officer_id}`, `In Progress` chip. (unchanged)
2. **Baseline card — "Officer's original result"** (NEW, dashed callout): qty checked, Good / Bad, % NC, and the officer's `decision` chip (e.g. Conditionally Accepted). This is the reference for both steps.
3. **Step 1 card — Officer accuracy** (blue, left-accent, numbered "1", pill "Judges: officer"): three tiles (officer qty checked · your sample 20% · good units you found), a `Good units found in your sample (of {sampleQty})` number input, and a live outcome box showing `= good ÷ sample × 100`, the `pct% — BAND`, and the band action. Caption: "Re-count the good units in your 20% sample. This scores the officer's reliability — it does not change the stock."
4. **Step 2 card — Stock condition** (amber, left-accent, numbered "2", pill "Judges: stock"): restate the officer's call ("Officer reported N bad unit(s) — do you agree?"), a large **Match / Mismatch** toggle. Match → green "no status change" note. Mismatch → reveal defect type, defect qty, severity, wastage reason + orange note "status change Available → Bad routed to approval queue." Caption: "Does your re-check agree with the officer's condition call? This decides the stock — a mismatch creates a status change, it does not re-score the officer."
5. **Save bar** (NEW): two outcome pills — `Officer: {pct% BAND}` and `Stock: Match · no change` / `Mismatch → approval` — plus the **Save Verification** button on the right.

## Data / logic (keep as-is, small additions)
- **`queries.ts` → `fetchCompletedInspections`:** make sure the select returns `qty_good, qty_bad, nc_pct, decision, sampling_qty` (and the joined `stock.name`) so the baseline card and "N bad units" can render.
- **Compute** with existing helpers: `sampleQty = verificationSampleQty(selected.sampling_qty)`, `compResult = compliance(goodQty, sampleQty)`. Officer bad qty for the prompt = `selected.qty_bad`.
- **Save (`createVerification`) unchanged** and still called for both Match and Mismatch (Match is logged). On **Mismatch only**, keep inserting the `status_changes` row (source `verification`, Available→Bad, Pending). Always `updateInspectionLifecycle(selected.id, 'RE_INSPECTED')`.
- **Validation for Save enabled:** `goodQty !== null && matchFlag !== null`; and when `matchFlag === false`, require `defectType`, `defectQty > 0`, `severity`, `wastageReason`. (Currently only `matchFlag` gates it and defect fields aren't validated.)
- Set `goodQty` initial state to `null` (not `0`) so the outcome shows a neutral "enter good units" prompt until typed, matching the prototype.

## Styles
Add the prototype's classes to `src/styles/prototype.css` (copy from the `<style>` block of `spv-verification-redesign.html`): `.evalcard`(+`.blue`/`.amber`), `.stepno`, `.evalhead-t/-s`, `.subject-pill`(+`.subject-officer`/`.subject-stock`), `.tiles/.tile`, `.origrow`, `.outcome`(+`.g/.y/.r`), `.toggle`, `.note`(+`.g/.o`), `.savebar/.savepills/.spill`, `.callout`. Reuse existing `.lab`, `.card`, `.field`, `.inp`, `.btn` where they already match.

## Verify
- Selecting an inspection shows the officer's original good/bad/%NC/decision baseline.
- Step 1: typing good units updates compliance % and band independently; Step 2 toggle updates Match/Mismatch independently — changing one never alters the other.
- Mismatch reveals and requires the four defect fields; Save disabled until both steps done (and defect fields on mismatch).
- Saving a **Match** still writes a verification row (no status change); a **Mismatch** writes the verification row **and** a pending `status_changes`.
- `pnpm test` + `pnpm build` pass.
