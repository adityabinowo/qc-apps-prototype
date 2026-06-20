# M1–M6 QC Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all six remaining milestones (Master Leveling, Task Management, Officer Inspection Flow, Approval/History, SPV Verification, Dashboard) so the app is end-to-end usable per `plan.md §10`.

**Architecture:** Thin feature pages call `src/data/queries.ts` for Supabase and `src/lib/rules.ts` for formulas. No logic in pages. All new rules get Vitest tests before implementation.

**Tech Stack:** Vite + React 18 + TypeScript, React Router v6, @supabase/supabase-js v2, @tanstack/react-query v5, jspdf, pnpm

**Dependency order:** M1 ∥ M2 → M3 → M4 ∥ M5 → M6

---

## M1 — Master SKU Leveling + Priority Generator

### Task 1.1 — Rules for leveling score + coverage

**Files:**
- Modify: `src/lib/rules.ts`
- Modify: `src/lib/rules.test.ts`

- [ ] Add to `rules.ts`:

```ts
export function coverageForLevel(level: LevelType): number {
  return level === 'LV1' ? 20 : level === 'LV2' ? 50 : 70
}

export function levelFromScore(riskScore: number): LevelType {
  if (riskScore <= 2) return 'LV1'
  if (riskScore <= 4) return 'LV2'
  return 'LV3'
}
```

- [ ] Add to `rules.test.ts`:

```ts
describe('levelFromScore', () => {
  it('score 1-2 → LV1', () => { expect(levelFromScore(2)).toBe('LV1') })
  it('score 3-4 → LV2', () => { expect(levelFromScore(4)).toBe('LV2') })
  it('score 5+ → LV3', () => { expect(levelFromScore(5)).toBe('LV3') })
})
```

- [ ] Run: `pnpm test` — expect PASS (24 tests)
- [ ] Commit: `git add src/lib/rules.ts src/lib/rules.test.ts && git commit -m "feat(rules): levelFromScore + coverageForLevel"`

### Task 1.2 — Queries for leveling CRUD

**Files:**
- Modify: `src/data/queries.ts`

- [ ] Add to `queries.ts`:

```ts
export async function fetchLeveling() {
  const { data, error } = await supabase
    .from('master_leveling')
    .select('*')
    .order('name')
  if (error) throw error
  return data as MasterLevelingInterface[]
}

export async function upsertLevelingRow(row: Partial<MasterLevelingInterface> & { sku_id: string }) {
  const { error } = await supabase.from('master_leveling').upsert(row)
  if (error) throw error
}

export async function fetchLevelingChangelog(skuId: string) {
  const { data, error } = await supabase
    .from('leveling_changelog')
    .select('*')
    .eq('sku_id', skuId)
    .order('ts', { ascending: false })
  if (error) throw error
  return data as LevelingChangelogInterface[]
}

export async function fetchPriorityList(week?: string) {
  const q = supabase.from('priority_list').select('*, master_leveling(name,category)')
  if (week) q.eq('week', week)
  const { data, error } = await q.order('risk_score', { ascending: false })
  if (error) throw error
  return data as PriorityListInterface[]
}

export async function insertPriorityList(rows: Omit<PriorityListInterface, 'id'>[]) {
  const { error } = await supabase.from('priority_list').insert(rows)
  if (error) throw error
}
```

- [ ] Commit: `git add src/data/queries.ts && git commit -m "feat(data): leveling + priority_list queries"`

### Task 1.3 — MasterLevelingPage

**Files:**
- Create: `src/features/leveling/MasterLevelingPage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { fetchLeveling, upsertLevelingRow, fetchLevelingChangelog } from '../../data/queries'
import { levelFromScore, coverageForLevel } from '../../lib/rules'
import type { MasterLevelingInterface, LevelType, CategoryType } from '../../lib/types'

const LEVELS: LevelType[] = ['LV1', 'LV2', 'LV3']
const CATEGORIES: CategoryType[] = ['Fresh', 'Frozen', 'Dry']

export function MasterLevelingPage() {
  const qc = useQueryClient()
  const { data: rows = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchLeveling })
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [lvlFilter, setLvlFilter] = useState('')
  const [editing, setEditing] = useState<Partial<MasterLevelingInterface> | null>(null)
  const [changelog, setChangelog] = useState<{ open: boolean; skuId: string }>({ open: false, skuId: '' })

  const save = useMutation({
    mutationFn: (row: Partial<MasterLevelingInterface> & { sku_id: string }) => upsertLevelingRow(row),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leveling'] }); setEditing(null) },
  })

  const filtered = rows.filter(r =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.sku_id.includes(search)) &&
    (!catFilter || r.category === catFilter) &&
    (!lvlFilter || r.level === lvlFilter)
  )

  const handleEdit = (row: MasterLevelingInterface) => setEditing({ ...row })
  const handleNew = () => setEditing({ sku_id: '', name: '', product_id: '', category: 'Fresh', risk_score: 1, priority: 'Low', level: 'LV1', coverage_pct: 20, manual_flag: false })

  const handleScoreChange = (score: number) => {
    if (!editing) return
    const level = editing.manual_flag ? editing.level! : levelFromScore(score)
    setEditing({ ...editing, risk_score: score, level, coverage_pct: coverageForLevel(level), priority: score <= 2 ? 'Low' : score <= 4 ? 'Medium' : 'High' })
  }

  const handleSave = () => {
    if (!editing?.sku_id) return
    save.mutate(editing as MasterLevelingInterface & { sku_id: string })
  }

  return (
    <section className="admin active" id="adm-leveling">
      <Topbar crumb="Phase 2 · Master SKU Leveling" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div><h1 className="h1">Master SKU Leveling Database</h1><p className="sub mb0">Single source of truth for risk level &amp; sampling coverage · every edit is change-logged</p></div>
          <button className="btn btn-primary lg" onClick={handleNew}>＋ Add / Edit SKU</button>
        </div>
        <div className="alert info"><span className="ic">ℹ️</span><div>Any SKU without a record defaults to <b>LV1 (20%)</b>. Escalation to LV2/LV3 is a manual override by PX Quality.</div></div>
        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU or product ID…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="inp" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="inp" value={lvlFilter} onChange={e => setLvlFilter(e.target.value)}>
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Product ID</th><th>Category</th><th>Risk score</th><th>Priority</th><th>Level</th><th>Coverage</th><th>Manual</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No records</td></tr>}
              {filtered.map(r => (
                <tr key={r.sku_id}>
                  <td className="skuname">{r.name}</td>
                  <td className="muted">{r.sku_id}</td>
                  <td>{r.category}</td>
                  <td>{r.risk_score}</td>
                  <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                  <td><b>{r.level}</b></td>
                  <td>{r.coverage_pct}%</td>
                  <td><span className={`lab ${r.manual_flag ? 'green' : 'grey'}`}>{r.manual_flag ? 'Yes' : 'No'}</span></td>
                  <td><button className="btn btn-naked sm" onClick={() => handleEdit(r)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing.sku_id && rows.find(r => r.sku_id === editing.sku_id) ? 'Edit SKU Leveling' : 'Add SKU Leveling'} onClose={() => setEditing(null)}>
          <div className="bd">
            <div className="grid2">
              <div className="field"><label>SKU ID <span className="req">*</span></label><input className="inp fullw" value={editing.sku_id || ''} onChange={e => setEditing({ ...editing, sku_id: e.target.value })} /></div>
              <div className="field"><label>Product ID</label><input className="inp fullw" value={editing.product_id || ''} onChange={e => setEditing({ ...editing, product_id: e.target.value })} /></div>
            </div>
            <div className="field"><label>Name <span className="req">*</span></label><input className="inp fullw" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid2">
              <div className="field"><label>Category</label>
                <select className="inp fullw" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as CategoryType })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Risk Score (1–6)</label>
                <input className="inp fullw" type="number" min={1} max={6} value={editing.risk_score || 1} onChange={e => handleScoreChange(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid2">
              <div className="field"><label>Level</label>
                <select className="inp fullw" value={editing.level} onChange={e => { const l = e.target.value as LevelType; setEditing({ ...editing, level: l, coverage_pct: coverageForLevel(l), manual_flag: true }) }}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="field"><label>Coverage %</label><input className="inp fullw" value={editing.coverage_pct || 20} readOnly /></div>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={!!editing.manual_flag} onChange={e => setEditing({ ...editing, manual_flag: e.target.checked })} style={{ marginRight: 6 }} />Manual override (locks level regardless of score)</label>
            </div>
          </div>
          <footer>
            <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={save.isPending}>Save</button>
          </footer>
        </Modal>
      )}
    </section>
  )
}
```

- [ ] Wire route in `App.tsx`: replace `<PlaceholderPage title="Master SKU Leveling".../>` with `<MasterLevelingPage />`
- [ ] Add import: `import { MasterLevelingPage } from './features/leveling/MasterLevelingPage'`
- [ ] Run `pnpm dev`, sign in as PX, navigate to Master SKU Leveling, verify table shows seeded data
- [ ] Commit: `git add src/features/leveling/ src/App.tsx && git commit -m "feat(M1): MasterLevelingPage with CRUD"`

### Task 1.4 — PriorityGeneratorPage

**Files:**
- Create: `src/features/generator/PriorityGeneratorPage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchLeveling, fetchPriorityList, insertPriorityList } from '../../data/queries'
import { riskPriority } from '../../lib/rules'
import type { PriorityListInterface } from '../../lib/types'

const PARAMS = ['Komplain pelanggan', 'Temuan audit internal', 'Riwayat NC tinggi', 'Kategori sensitif', 'Musim/cuaca', 'Vendor baru']

function getWeekString() {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - d.getDay() + 1)
  return monday.toISOString().slice(0, 10)
}

export function PriorityGeneratorPage() {
  const qc = useQueryClient()
  const { data: leveling = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchLeveling })
  const week = getWeekString()
  const { data: existing = [] } = useQuery({ queryKey: ['priority_list', week], queryFn: () => fetchPriorityList(week) })
  const [paramSelections, setParamSelections] = useState<Record<string, boolean[]>>({})
  const [generated, setGenerated] = useState<PriorityListInterface[]>([])
  const [showGenerated, setShowGenerated] = useState(false)

  const toggle = (skuId: string, idx: number) => {
    const cur = paramSelections[skuId] ?? Array(6).fill(false)
    const next = [...cur]; next[idx] = !next[idx]
    setParamSelections(p => ({ ...p, [skuId]: next }))
  }

  const handleGenerate = () => {
    const rows: PriorityListInterface[] = leveling.map(sku => {
      const params = paramSelections[sku.sku_id] ?? Array(6).fill(false)
      const paramsMet = params.filter(Boolean).length
      const priority = riskPriority(paramsMet)
      return {
        id: crypto.randomUUID(),
        week,
        sku_id: sku.sku_id,
        params_met: paramsMet,
        risk_score: sku.risk_score,
        priority,
        level: sku.level,
        status: 'Pending',
        generated_at: new Date().toISOString(),
      } as PriorityListInterface
    })
    setGenerated(rows)
    setShowGenerated(true)
  }

  const save = useMutation({
    mutationFn: () => insertPriorityList(generated),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['priority_list'] }); setShowGenerated(false) },
  })

  return (
    <section className="admin active" id="adm-generator">
      <Topbar crumb="Phase 2 · Priority Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div><h1 className="h1">Priority Generator</h1><p className="sub mb0">Score 6 risk parameters per SKU → generate this week's inspection priority list</p></div>
          {!showGenerated && <button className="btn btn-primary lg" onClick={handleGenerate} disabled={leveling.length === 0}>⚙️ Generate</button>}
          {showGenerated && (
            <div className="row">
              <button className="btn btn-outline" onClick={() => setShowGenerated(false)}>← Back</button>
              <button className="btn btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Save Priority List</button>
            </div>
          )}
        </div>

        {!showGenerated && (
          <>
            <div className="alert info"><span className="ic">ℹ️</span><div>Check which risk parameters apply to each SKU this week. SKUs with <b>Manual flag</b> are always included at their locked level.</div></div>
            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>SKU</th><th>Level</th>
                    {PARAMS.map((p, i) => <th key={i} style={{ fontSize: 10 }}>{p}</th>)}
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leveling.map(sku => {
                    const params = paramSelections[sku.sku_id] ?? Array(6).fill(false)
                    const met = params.filter(Boolean).length
                    return (
                      <tr key={sku.sku_id}>
                        <td><div className="skuname">{sku.name}</div><div className="muted">{sku.sku_id}</div></td>
                        <td><b>{sku.level}</b></td>
                        {params.map((on, i) => (
                          <td key={i} style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={on} onChange={() => toggle(sku.sku_id, i)} disabled={!!sku.manual_flag} />
                          </td>
                        ))}
                        <td><span className={`lab ${met >= 5 ? 'red' : met >= 3 ? 'orange' : 'grey'}`}>{met}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showGenerated && (
          <>
            <div className="alert success"><span className="ic">✅</span><div>Generated {generated.length} SKUs for week {week}. Review below, then save.</div></div>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Level</th><th>Risk Score</th><th>Params Met</th><th>Priority</th></tr></thead>
                <tbody>
                  {generated.map(r => (
                    <tr key={r.sku_id}>
                      <td className="skuname">{leveling.find(l => l.sku_id === r.sku_id)?.name ?? r.sku_id}</td>
                      <td><b>{r.level}</b></td>
                      <td>{r.risk_score}</td>
                      <td>{r.params_met}</td>
                      <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {existing.length > 0 && !showGenerated && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">This week's saved list ({week})</h3>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Level</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {existing.map(r => (
                    <tr key={r.id}>
                      <td className="skuname">{(r as any).master_leveling?.name ?? r.sku_id}</td>
                      <td><b>{r.level}</b></td>
                      <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                      <td><span className={`lab ${r.status === 'Done' ? 'green' : 'grey'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] Wire route in `App.tsx`: replace generator placeholder with `<PriorityGeneratorPage />`
- [ ] Commit: `git add src/features/generator/ src/App.tsx && git commit -m "feat(M1): PriorityGeneratorPage"`

---

## M2 — Task Management (SPV)

### Task 2.1 — Task queries

**Files:**
- Modify: `src/data/queries.ts`

- [ ] Add to `queries.ts` (createTask already exists — add auto-overdue fetch):

```ts
export async function fetchTasksWithOverdue(hubId?: string) {
  const q = supabase.from('tasks').select('*, stock(name,category)')
  if (hubId) q.eq('hub_id', hubId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  const now = new Date()
  return (data as any[]).map(t => ({
    ...t,
    status: t.status !== 'Done' && new Date(t.deadline) < now ? 'Overdue' : t.status,
  })) as TaskInterface[]
}
```

- [ ] Commit: `git add src/data/queries.ts && git commit -m "feat(data): fetchTasksWithOverdue"`

### Task 2.2 — TaskManagementPage

**Files:**
- Create: `src/features/tasks/TaskManagementPage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { fetchTasksWithOverdue, createTask, fetchStock, fetchUsers } from '../../data/queries'
import { coverageForLevel } from '../../lib/rules'
import type { TaskInterface, LevelType, PriorityType } from '../../lib/types'

const STATUS_COLORS: Record<string, string> = { Pending: 'grey', 'In Progress': 'blue', Done: 'green', Overdue: 'red' }
const PRIORITIES: PriorityType[] = ['Low', 'Medium', 'High']
const LEVELS: LevelType[] = ['LV1', 'LV2', 'LV3']

function defaultDeadline() {
  const d = new Date(); d.setHours(18, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export function TaskManagementPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const hubId = auth.hub?.id
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', hubId], queryFn: () => fetchTasksWithOverdue(hubId) })
  const { data: stock = [] } = useQuery({ queryKey: ['stock', hubId], queryFn: () => fetchStock(hubId) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const officers = users.filter(u => u.role === 'officer')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ sku_id: '', officer_id: '', priority: 'Medium' as PriorityType, level: 'LV1' as LevelType, deadline: defaultDeadline(), instructions: '' })

  const save = useMutation({
    mutationFn: () => createTask({
      sku_id: form.sku_id,
      hub_id: hubId!,
      officer_id: form.officer_id || undefined,
      priority: form.priority,
      level: form.level,
      coverage_pct: coverageForLevel(form.level),
      deadline: new Date(form.deadline).toISOString(),
      instructions: form.instructions,
      status: 'Pending',
      created_by: auth.user!.id,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false) },
  })

  const filtered = tasks.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    (!search || (t as any).stock?.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const statusChips = ['All', 'Pending', 'In Progress', 'Done', 'Overdue']

  return (
    <section className="admin active" id="adm-tasks">
      <Topbar crumb="Task Management" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div><h1 className="h1">Task Management</h1><p className="sub mb0">Create &amp; assign daily inspection tasks</p></div>
          <button className="btn btn-primary lg" onClick={() => setShowCreate(true)}>＋ Create Task</button>
        </div>
        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          {statusChips.map(s => (
            <span key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(s)}>{s}</span>
          ))}
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Task ID</th><th>SKU</th><th>Priority</th><th>Level</th><th>Officer</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No tasks</td></tr>}
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="muted">{t.id.slice(0, 8).toUpperCase()}</td>
                  <td><div className="skuname">{(t as any).stock?.name ?? t.sku_id}</div><div className="muted">{t.sku_id}</div></td>
                  <td><span className={`lab ${t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'orange' : 'grey'}`}>{t.priority}</span></td>
                  <td>{t.level} · {t.coverage_pct}%</td>
                  <td>{officers.find(u => u.id === t.officer_id)?.name ?? <span className="muted">Any officer</span>}</td>
                  <td>{new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className={`lab ${STATUS_COLORS[t.status]}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title="Create Task" onClose={() => setShowCreate(false)}>
          <div className="bd">
            <div className="field"><label>SKU <span className="req">*</span></label>
              <select className="inp fullw" value={form.sku_id} onChange={e => setForm(f => ({ ...f, sku_id: e.target.value }))}>
                <option value="">Select SKU…</option>
                {stock.map(s => <option key={s.sku_id} value={s.sku_id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid2">
              <div className="field"><label>Priority</label>
                <select className="inp fullw" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as PriorityType }))}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="field"><label>Level</label>
                <select className="inp fullw" value={form.level} onChange={e => { const l = e.target.value as LevelType; setForm(f => ({ ...f, level: l })) }}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field"><label>Officer (optional)</label>
                <select className="inp fullw" value={form.officer_id} onChange={e => setForm(f => ({ ...f, officer_id: e.target.value }))}>
                  <option value="">Any officer</option>
                  {officers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Deadline</label>
                <input className="inp fullw" type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value })) } />
              </div>
            </div>
            <div className="field"><label>Instructions (≤ 500 chars)</label>
              <textarea className="inp fullw" maxLength={500} rows={3} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
          </div>
          <footer>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => save.mutate()} disabled={!form.sku_id || save.isPending}>Create</button>
          </footer>
        </Modal>
      )}
    </section>
  )
}
```

- [ ] Wire route in `App.tsx`: replace tasks placeholder with `<TaskManagementPage />`
- [ ] Commit: `git add src/features/tasks/ src/App.tsx && git commit -m "feat(M2): TaskManagementPage"`

---

## M3 — Officer Flow

### Task 3.1 — Image compression util

**Files:**
- Create: `src/lib/image.ts`

- [ ] Create file:

```ts
export async function compressToUnder1MB(file: File): Promise<Blob> {
  const MAX = 900 * 1024
  if (file.size <= MAX) return file
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      let quality = 0.85
      const scale = Math.sqrt(MAX / file.size)
      width = Math.round(width * scale); height = Math.round(height * scale)
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const tryEncode = (q: number) => {
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('canvas.toBlob failed'))
          if (blob.size <= MAX || q <= 0.3) return resolve(blob)
          tryEncode(q - 0.1)
        }, 'image/jpeg', q)
      }
      tryEncode(quality)
    }
    img.onerror = reject
    img.src = url
  })
}
```

- [ ] Commit: `git add src/lib/image.ts && git commit -m "feat(lib): compressToUnder1MB"`

### Task 3.2 — PDF receipt util

**Files:**
- Create: `src/lib/pdf.ts`

- [ ] Create file:

```ts
import jsPDF from 'jspdf'
import type { InspectionInterface } from './types'

export function buildQualityReceipt(inspection: InspectionInterface & { skuName?: string; officerName?: string; hubName?: string }): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(41, 29, 128)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('QUALITY RECEIPT', W / 2, 12, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('Astro Quality Control', W / 2, 20, { align: 'center' })

  doc.setTextColor(40, 40, 40)
  let y = 36
  const row = (k: string, v: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(k, 10, y)
    doc.setFont('helvetica', 'normal'); doc.text(v, W / 2, y); y += 7
  }

  row('SKU', inspection.skuName ?? inspection.sku_id)
  row('Hub', inspection.hubName ?? inspection.hub_id)
  row('Officer', inspection.officerName ?? inspection.officer_id)
  row('Date', new Date(inspection.created_at).toLocaleString('id-ID'))
  row('SOH', String(inspection.soh))
  row('Sampling qty', String(inspection.sampling_qty))
  row('Good / Bad', `${inspection.qty_good} / ${inspection.qty_bad}`)
  row('% Non-Conf', `${inspection.nc_pct?.toFixed(1)}%`)
  row('Decision', inspection.decision ?? '')
  row('Lifecycle state', inspection.lifecycle_state ?? '')

  return doc.output('blob')
}
```

- [ ] Commit: `git add src/lib/pdf.ts && git commit -m "feat(lib): buildQualityReceipt PDF"`

### Task 3.3 — Officer Inbox

**Files:**
- Create: `src/features/officer/InboxPage.tsx`

- [ ] Create file:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchTasksWithOverdue } from '../../data/queries'

const STATUS_PILL: Record<string, string> = { Pending: 'pending', 'In Progress': 'prog', Done: 'done', Overdue: 'over' }

export function InboxPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', auth.hub?.id],
    queryFn: () => fetchTasksWithOverdue(auth.hub?.id),
  })
  const myTasks = tasks.filter(t => !t.officer_id || t.officer_id === auth.user?.id)
  const [filter, setFilter] = useState('All')
  const chips = ['All', 'Pending', 'In Progress', 'Overdue']
  const filtered = myTasks.filter(t => filter === 'All' || t.status === filter)

  const active = myTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar">
        <div className="hub">{auth.hub?.name}</div>
        <div className="ttl">Task Inbox <span className="badge">{active}</span></div>
      </div>
      <div className="m-chips">
        {chips.map(c => <button key={c} className={`m-chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      <div className="m-body">
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)', fontSize: 13 }}>No tasks</div>}
        {filtered.map(t => (
          <div key={t.id} className="m-task" onClick={() => navigate(`/app/officer/stock`, { state: { task: t } })} style={{ cursor: 'pointer' }}>
            <div className="top">
              <div className="nm">{(t as any).stock?.name ?? t.sku_id}</div>
              <span className={`m-pri ${t.priority === 'High' ? 'high' : t.priority === 'Medium' ? 'med' : 'low'}`}>{t.priority}</span>
            </div>
            <div className="meta">{t.level} · {t.coverage_pct}% coverage</div>
            <div className="foot">
              <div className="dl">Due {new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <span className={`m-pill ${STATUS_PILL[t.status] ?? 'pending'}`}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] Wire route: replace `officer/inbox` placeholder with `<InboxPage />`
- [ ] Commit: `git add src/features/officer/InboxPage.tsx src/App.tsx && git commit -m "feat(M3): InboxPage"`

### Task 3.4 — Stock detail + Inspection Wizard

**Files:**
- Create: `src/features/officer/StockPage.tsx`
- Create: `src/features/officer/InspectionWizard.tsx`

- [ ] Create `StockPage.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStock } from '../../data/queries'
import { samplingQty } from '../../lib/rules'
import type { TaskInterface } from '../../lib/types'

export function StockPage() {
  const { state } = useLocation() as { state: { task: TaskInterface } }
  const navigate = useNavigate()
  const { data: stocks = [] } = useQuery({ queryKey: ['stock'], queryFn: () => fetchStock() })
  const task = state?.task
  const stock = stocks.find(s => s.sku_id === task?.sku_id)
  if (!task || !stock) return <div style={{ padding: 24 }}>No task selected. <button onClick={() => navigate('/app/officer/inbox')}>Back</button></div>
  const sampleQty = samplingQty(task.coverage_pct, stock.soh)

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar midnight">
        <div className="hub">Open Task</div>
        <div className="ttl">{stock.name}</div>
      </div>
      <div className="m-body">
        <div className="m-highlight">
          <div className="lbl">Sampling target</div>
          <div className="big">{sampleQty} pcs <span style={{ fontSize: 14 }}>of {stock.soh} SOH</span></div>
        </div>
        <div className="m-card">
          <h4>📦 Stock Info</h4>
          <div className="m-kv"><div className="k">SKU ID</div><div className="v">{stock.sku_id}</div></div>
          <div className="m-kv"><div className="k">Category</div><div className="v">{stock.category}</div></div>
          <div className="m-kv"><div className="k">SLOC</div><div className="v">{stock.sloc}</div></div>
          <div className="m-kv"><div className="k">SOH</div><div className="v">{stock.soh}</div></div>
          <div className="m-kv"><div className="k">Status</div><div className="v">{stock.stock_status}</div></div>
          <div className="m-kv"><div className="k">Level</div><div className="v">{task.level} · {task.coverage_pct}%</div></div>
        </div>
        {task.instructions && (
          <div className="m-card"><h4>📋 Instructions</h4><p style={{ fontSize: 12, color: 'var(--secondaryText)', margin: 0 }}>{task.instructions}</p></div>
        )}
        <button className="m-btn" onClick={() => navigate('/app/officer/step1', { state: { task, stock, sampleQty } })}>Start Inspection →</button>
      </div>
    </div>
  )
}
```

- [ ] Create `InspectionWizard.tsx` (Step 1 + Step 2 combined with step state):

```tsx
import { useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createInspection, updateInspectionLifecycle } from '../../data/queries'
import { nonConformityPct, decide } from '../../lib/rules'
import { compressToUnder1MB } from '../../lib/image'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CONFIG } from '../../lib/config'
import type { TaskInterface, StockInterface } from '../../lib/types'

const DEFECT_REASONS = ['Berjamur', 'Lembek (handling)', 'Busuk', 'Expired', 'Kemasan rusak', 'Suhu tidak sesuai', 'Lainnya']
const STORAGE_CONDITIONS = ['Suhu OK', 'Suhu tidak sesuai', 'Kemasan rusak', 'Area kotor']

type Step1Data = { productTemp: string; storageCondition: string; earlyStop: boolean; earlyReason: string }
type Step2Data = { qtyGood: number; qtyBad: number; defectReasons: string[]; defectDesc: string; photos: File[] }

export function InspectionStep1() {
  const { state } = useLocation() as { state: { task: TaskInterface; stock: StockInterface; sampleQty: number } }
  const navigate = useNavigate()
  const [d, setD] = useState<Step1Data>({ productTemp: '', storageCondition: 'Suhu OK', earlyStop: false, earlyReason: '' })

  if (!state?.task) return <div style={{ padding: 24 }}>No task. <button onClick={() => navigate('/app/officer/inbox')}>Back</button></div>

  const handleNext = () => {
    if (d.earlyStop) {
      navigate('/app/officer/step2', { state: { ...state, step1: d, earlyStop: true } })
    } else {
      navigate('/app/officer/step2', { state: { ...state, step1: d, earlyStop: false } })
    }
  }

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar midnight"><div className="hub">Inspection</div><div className="ttl">{state.stock.name}</div></div>
      <div className="m-step"><div className="s on"/><div className="s"/></div>
      <div className="m-body">
        <div className="m-card">
          <h4>🧊 Step 1 — Storage Conditions</h4>
          <div className="m-field"><label>Product Temp (°C)</label><input className="m-inp" type="number" step="0.1" value={d.productTemp} onChange={e => setD(p => ({ ...p, productTemp: e.target.value }))} placeholder="e.g. 4.5" /></div>
          <div className="m-field"><label>Storage Condition</label>
            <div className="m-seg">
              {STORAGE_CONDITIONS.map(c => (
                <button key={c} className={`${d.storageCondition === c ? (c === 'Suhu OK' ? 'on-ok' : 'on-warn') : ''}`} onClick={() => setD(p => ({ ...p, storageCondition: c }))} style={{ border: '1px solid #d8e2ec', borderRadius: 10, padding: '9px 6px', fontSize: 11, fontWeight: 600, background: d.storageCondition === c ? undefined : '#fff' }}>{c}</button>
              ))}
            </div>
          </div>
          <div className="m-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={d.earlyStop} onChange={e => setD(p => ({ ...p, earlyStop: e.target.checked }))} />
              Early stop — Quarantine All now (critical storage failure)
            </label>
          </div>
          {d.earlyStop && <div className="m-field"><label>Reason</label><input className="m-inp" value={d.earlyReason} onChange={e => setD(p => ({ ...p, earlyReason: e.target.value }))} placeholder="Describe the critical issue…" /></div>}
        </div>
        <button className="m-btn" onClick={handleNext} disabled={!d.productTemp}>Next →</button>
      </div>
    </div>
  )
}

export function InspectionStep2() {
  const { state } = useLocation() as { state: { task: TaskInterface; stock: StockInterface; sampleQty: number; step1: Step1Data; earlyStop: boolean } }
  const navigate = useNavigate()
  const { auth } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [d, setD] = useState<Step2Data>({ qtyGood: 0, qtyBad: 0, defectReasons: [], defectDesc: '', photos: [] })
  const [uploading, setUploading] = useState(false)

  const totalChecked = d.qtyGood + d.qtyBad
  const validQty = state?.earlyStop || totalChecked === state?.sampleQty

  const submit = useMutation({
    mutationFn: async () => {
      const step1 = state.step1
      const earlyStop = state.earlyStop
      const ncPct = earlyStop ? 100 : nonConformityPct(d.qtyBad, state.sampleQty)
      const decision = earlyStop ? decide(100, CONFIG) : decide(ncPct, CONFIG)

      setUploading(true)
      const photoUrls: string[] = []
      for (const f of d.photos) {
        const compressed = await compressToUnder1MB(f)
        const path = `${Date.now()}-${f.name}`
        const { data: up } = await supabase.storage.from('inspection-photos').upload(path, compressed, { upsert: true })
        if (up) {
          const { data: pub } = supabase.storage.from('inspection-photos').getPublicUrl(up.path)
          photoUrls.push(pub.publicUrl)
        }
      }
      setUploading(false)

      const inspection = await createInspection({
        task_id: state.task.id,
        sku_id: state.task.sku_id,
        officer_id: auth.user!.id,
        hub_id: auth.hub!.id,
        soh: state.stock.soh,
        sampling_qty: state.sampleQty,
        product_temp: parseFloat(step1.productTemp),
        qty_good: earlyStop ? 0 : d.qtyGood,
        qty_bad: earlyStop ? state.sampleQty : d.qtyBad,
        total_defect: earlyStop ? state.sampleQty : d.qtyBad,
        defect_reasons: earlyStop ? ['Early stop — critical storage'] : d.defectReasons,
        defect_desc: earlyStop ? step1.earlyReason : d.defectDesc,
        nc_pct: ncPct,
        decision: decision.band,
        recommended_action: decision.recommendedAction,
        proposed_status: decision.proposesStatusChange ? 'Bad' : null,
        lifecycle_state: 'SUBMITTED',
      })

      if (photoUrls.length > 0) {
        for (const url of photoUrls) {
          await supabase.from('inspection_photos').insert({ inspection_id: inspection.id, url, is_defect: true })
        }
      }

      let nextState = 'SUBMITTED'
      if (decision.band === 'Accepted') nextState = 'COMPLETED'
      else if (decision.band === 'Conditionally Accepted') nextState = 'PENDING_SORT'
      else nextState = 'PENDING_APPROVAL'

      await updateInspectionLifecycle(inspection.id, nextState as any)
      if (decision.proposesStatusChange) {
        await supabase.from('status_changes').insert({
          inspection_id: inspection.id,
          sku_id: state.task.sku_id,
          hub_id: auth.hub!.id,
          old_status: 'Available',
          new_status: 'Bad',
          state: 'Pending',
          source: 'inspection',
          submitted_at: new Date().toISOString(),
        })
      }

      navigate('/app/officer/result', { state: { inspection: { ...inspection, lifecycle_state: nextState }, decision, ncPct, skuName: state.stock.name } })
    },
  })

  const toggleDefect = (r: string) => setD(p => ({ ...p, defectReasons: p.defectReasons.includes(r) ? p.defectReasons.filter(x => x !== r) : [...p.defectReasons, r] }))

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setD(p => ({ ...p, photos: [...p.photos, ...Array.from(e.target.files!)] }))
  }

  if (!state?.task) return <div style={{ padding: 24 }}>No task. <button onClick={() => navigate('/app/officer/inbox')}>Back</button></div>

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar midnight"><div className="hub">Inspection</div><div className="ttl">{state.stock.name}</div></div>
      <div className="m-step"><div className="s on"/><div className="s on"/></div>
      <div className="m-body">
        {state.earlyStop ? (
          <div className="alert err" style={{ margin: '0 0 16px' }}>⚠️ Early stop mode — recording as Quarantine All</div>
        ) : (
          <div className="m-card">
            <h4>🔬 Step 2 — Item Inspection</h4>
            <div className="m-highlight">
              <div className="lbl">Sample target</div>
              <div className="big">{state.sampleQty} pcs &nbsp;<span style={{ fontSize: 13 }}>({d.qtyGood + d.qtyBad} entered)</span></div>
            </div>
            <div className="m-field"><label>Good Qty</label><input className="m-inp" type="number" min={0} value={d.qtyGood} onChange={e => setD(p => ({ ...p, qtyGood: Number(e.target.value) }))} /></div>
            <div className="m-field"><label>Bad Qty</label><input className="m-inp" type="number" min={0} value={d.qtyBad} onChange={e => setD(p => ({ ...p, qtyBad: Number(e.target.value) }))} /></div>
            {totalChecked !== state.sampleQty && totalChecked > 0 && (
              <div className="alert warn mb0">Good + Bad must equal {state.sampleQty}. Current: {totalChecked}</div>
            )}
            <div className="m-field" style={{ marginTop: 12 }}><label>Defect Reasons</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DEFECT_REASONS.map(r => (
                  <button key={r} onClick={() => toggleDefect(r)} style={{ border: `1px solid ${d.defectReasons.includes(r) ? 'var(--red)' : '#d8e2ec'}`, background: d.defectReasons.includes(r) ? '#FFEAEF' : '#fff', borderRadius: 99, padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: d.defectReasons.includes(r) ? 'var(--red)' : 'var(--secondaryText)' }}>{r}</button>
                ))}
              </div>
            </div>
            <div className="m-field"><label>Notes</label><textarea className="m-inp" rows={2} value={d.defectDesc} onChange={e => setD(p => ({ ...p, defectDesc: e.target.value }))} /></div>
          </div>
        )}
        <div className="m-card">
          <h4>📷 Photos</h4>
          <div className="m-photos">
            {d.photos.map((f, i) => <div key={i} className="m-ph">📷</div>)}
            <div className="m-ph add" onClick={() => fileRef.current?.click()}>＋</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPhoto} />
        </div>
        <button className="m-btn" onClick={() => submit.mutate()} disabled={!validQty || submit.isPending || uploading}>
          {submit.isPending || uploading ? 'Submitting…' : 'Submit Inspection'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] Wire routes: `officer/stock` → `<StockPage />`, `officer/step1` → `<InspectionStep1 />`, `officer/step2` → `<InspectionStep2 />`
- [ ] Commit: `git add src/features/officer/ src/App.tsx && git commit -m "feat(M3): StockPage + InspectionWizard steps 1+2"`

### Task 3.5 — Result + Receipt pages

**Files:**
- Create: `src/features/officer/ResultPage.tsx`
- Create: `src/features/officer/ReceiptPage.tsx`

- [ ] Create `ResultPage.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import type { DecisionResultInterface } from '../../lib/types'

export function ResultPage() {
  const { state } = useLocation() as { state: { inspection: any; decision: DecisionResultInterface; ncPct: number; skuName: string } }
  const navigate = useNavigate()
  if (!state) return <div style={{ padding: 24 }}>No result. <button onClick={() => navigate('/app/officer/inbox')}>Back to Inbox</button></div>
  const { decision, ncPct, skuName, inspection } = state
  const cls = decision.band === 'Accepted' ? 'ok' : decision.band === 'Conditionally Accepted' ? 'cond' : 'bad'
  const label = decision.band === 'Accepted' ? 'Accepted' : decision.band === 'Conditionally Accepted' ? 'Cond. Accepted' : 'Quarantine All'

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar midnight"><div className="hub">Result</div><div className="ttl">{skuName}</div></div>
      <div className="m-body">
        <div className={`m-result ${cls}`}>
          <div className="pct">{ncPct === 100 ? '—' : `${ncPct.toFixed(1)}%`}</div>
          <div className="verdict">{label}</div>
          <div className="desc">{decision.recommendedAction}</div>
        </div>
        <div className="m-card">
          <h4>📊 Summary</h4>
          <div className="m-kv"><div className="k">Lifecycle state</div><div className="v">{inspection.lifecycle_state}</div></div>
          <div className="m-kv"><div className="k">Decision</div><div className="v">{inspection.decision}</div></div>
          <div className="m-kv"><div className="k">WMS change proposed</div><div className="v">{inspection.proposed_status ? `Available → ${inspection.proposed_status}` : 'None'}</div></div>
        </div>
        <button className="m-btn" onClick={() => navigate('/app/officer/receipt', { state })}>Download Receipt →</button>
        <button className="m-btn outline" style={{ marginTop: 10 }} onClick={() => navigate('/app/officer/inbox')}>Back to Inbox</button>
      </div>
    </div>
  )
}
```

- [ ] Create `ReceiptPage.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { buildQualityReceipt } from '../../lib/pdf'

export function ReceiptPage() {
  const { state } = useLocation() as { state: any }
  const navigate = useNavigate()

  const handleDownload = () => {
    const blob = buildQualityReceipt(state.inspection)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `receipt-${state.inspection.id.slice(0, 8)}.pdf`
    a.click(); URL.revokeObjectURL(url)
  }

  if (!state) return <div style={{ padding: 24 }}>No data. <button onClick={() => navigate('/app/officer/inbox')}>Back</button></div>

  return (
    <div className="scr" style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div className="m-topbar midnight"><div className="hub">Receipt</div><div className="ttl">Quality Receipt</div></div>
      <div className="receipt" style={{ margin: 14 }}>
        <div className="rhead"><div className="t">QUALITY RECEIPT</div><div className="s">Astro Quality Control</div></div>
        <div className="rbody">
          <div className="rsec">Inspection</div>
          <div className="rrow"><span className="k">SKU</span><span className="v">{state.skuName}</span></div>
          <div className="rrow"><span className="k">Decision</span><span className="v">{state.decision.band}</span></div>
          <div className="rrow"><span className="k">% NC</span><span className="v">{state.ncPct?.toFixed(1)}%</span></div>
          <div className="rrow"><span className="k">State</span><span className="v">{state.inspection.lifecycle_state}</span></div>
          <div className="rrow"><span className="k">Date</span><span className="v">{new Date(state.inspection.created_at).toLocaleString('id-ID')}</span></div>
        </div>
      </div>
      <div className="m-body">
        <button className="m-btn" onClick={handleDownload}>⬇ Download PDF</button>
        <button className="m-btn outline" style={{ marginTop: 10 }} onClick={() => navigate('/app/officer/inbox')}>Back to Inbox</button>
      </div>
    </div>
  )
}
```

- [ ] Wire routes: `officer/result` → `<ResultPage />`, `officer/receipt` → `<ReceiptPage />`
- [ ] Run `pnpm build` — verify clean build
- [ ] Commit: `git add src/features/officer/ src/App.tsx && git commit -m "feat(M3): ResultPage + ReceiptPage"`

---

## M4 — Approval Queue + Change History

### Task 4.1 — Approval queries

**Files:**
- Modify: `src/data/queries.ts`

- [ ] Add to `queries.ts`:

```ts
export async function fetchPendingApprovals() {
  const { data, error } = await supabase
    .from('status_changes')
    .select('*, inspections(nc_pct, defect_reasons, defect_desc, inspection_photos(url)), stock(name,category,sloc,soh,last_ed)')
    .eq('state', 'Pending')
    .order('submitted_at')
  if (error) throw error
  return data as any[]
}

export async function approveStatusChange(id: string, decidedBy: string) {
  const { data: sc, error } = await supabase.from('status_changes').select('sku_id, new_status').eq('id', id).single()
  if (error || !sc) throw error ?? new Error('not found')
  await supabase.from('status_changes').update({ state: 'Approved', decided_by: decidedBy, decided_at: new Date().toISOString() }).eq('id', id)
  await supabase.from('stock').update({ stock_status: sc.new_status }).eq('sku_id', sc.sku_id)
  await supabase.from('audit_log').insert({ entity: 'status_changes', entity_id: id, action: 'APPROVED', payload: sc, actor: decidedBy, ts: new Date().toISOString() })
}

export async function rejectStatusChange(id: string, reason: string, decidedBy: string) {
  await supabase.from('status_changes').update({ state: 'Rejected', reason, decided_by: decidedBy, decided_at: new Date().toISOString() }).eq('id', id)
  await supabase.from('audit_log').insert({ entity: 'status_changes', entity_id: id, action: 'REJECTED', payload: { reason }, actor: decidedBy, ts: new Date().toISOString() })
}

export async function fetchAuditLog() {
  const { data, error } = await supabase
    .from('status_changes')
    .select('*, stock(name)')
    .in('state', ['Approved', 'Rejected'])
    .order('decided_at', { ascending: false })
  if (error) throw error
  return data as any[]
}
```

- [ ] Commit: `git add src/data/queries.ts && git commit -m "feat(data): approval + audit queries"`

### Task 4.2 — ApprovalQueuePage

**Files:**
- Create: `src/features/approval/ApprovalQueuePage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { fetchPendingApprovals, approveStatusChange, rejectStatusChange } from '../../data/queries'

function ageLabel(submitted: string) {
  const mins = Math.round((Date.now() - new Date(submitted).getTime()) / 60000)
  return mins > 60 ? `${Math.round(mins / 60)}h` : `${mins} min`
}

export function ApprovalQueuePage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const { data: pending = [] } = useQuery({ queryKey: ['approvals'], queryFn: fetchPendingApprovals, refetchInterval: 30000 })
  const [selected, setSelected] = useState<any | null>(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const approve = useMutation({
    mutationFn: () => approveStatusChange(selected!.id, auth.user!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); setSelected(null) },
  })
  const reject = useMutation({
    mutationFn: () => rejectStatusChange(selected!.id, rejectReason, auth.user!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); setSelected(null); setRejectModal(false) },
  })

  const overSla = pending.filter(p => (Date.now() - new Date(p.submitted_at).getTime()) > 15 * 60000)

  return (
    <section className="admin active" id="adm-approval">
      <Topbar crumb="Approval Queue" />
      <div className="page">
        <h1 className="h1">Status Change Approval Queue</h1>
        <p className="sub">Gate before WIMS write · SLA reminder at 5 min, escalation at 15 min</p>
        {overSla.length > 0 && (
          <div className="alert warn"><span className="ic">⏱️</span><div><b>{overSla.length} approval{overSla.length > 1 ? 's are' : ' is'} over SLA</b> (waiting &gt;15 min).</div></div>
        )}
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: '0 0 340px' }}>
            <div className="pheader">Pending · {pending.length}</div>
            <div style={{ padding: '8px 10px' }}>
              {pending.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--secondaryText)', fontSize: 13 }}>No pending approvals</div>}
              {pending.map(p => {
                const age = ageLabel(p.submitted_at)
                const ageNum = Math.round((Date.now() - new Date(p.submitted_at).getTime()) / 60000)
                const isSelected = selected?.id === p.id
                return (
                  <div key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--main)' : 'var(--border)'}`, background: isSelected ? 'var(--mainFaded)' : '#fff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                    <div className="between"><div className="skuname">{p.stock?.name ?? p.sku_id}</div><span className={`lab ${ageNum > 15 ? 'red' : ageNum > 5 ? 'yellow' : 'grey'}`}>{age}</span></div>
                    <div className="muted" style={{ marginTop: 4 }}>{p.sku_id} · {p.hub_id}</div>
                    <div style={{ marginTop: 8 }}><span className="lab green">Available</span> <span style={{ color: 'var(--secondaryText)' }}>→</span> <span className="lab red">Bad</span></div>
                  </div>
                )
              })}
            </div>
          </div>

          {selected ? (
            <div className="card card-pad" style={{ flex: 1 }}>
              <div className="between" style={{ marginBottom: 14 }}>
                <div><div className="skuname" style={{ fontSize: 17 }}>{selected.stock?.name ?? selected.sku_id}</div><div className="muted">{selected.sku_id} · {selected.hub_id}</div></div>
                <span className={`lab ${ageLabel(selected.submitted_at).includes('h') || parseInt(ageLabel(selected.submitted_at)) > 15 ? 'red' : 'yellow'}`}>
                  {ageLabel(selected.submitted_at)}
                </span>
              </div>
              <div className="compare">
                <div>
                  <h5>Current — WIMS</h5>
                  <span className="lab green">Available</span>
                  <div className="kv" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
                    {selected.stock?.sloc && <div><div className="k">SLOC</div><div className="val">{selected.stock.sloc}</div></div>}
                    {selected.stock?.soh && <div><div className="k">Stock on Hand</div><div className="val">{selected.stock.soh}</div></div>}
                  </div>
                </div>
                <div>
                  <h5>Reported — QA Officer</h5>
                  <span className="lab red">Bad (Quarantine)</span>
                  <div className="kv" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
                    {selected.inspections && <><div><div className="k">% Non-Conformity</div><div className="val" style={{ color: 'var(--red)' }}>{selected.inspections.nc_pct?.toFixed(1)}%</div></div>
                    <div><div className="k">Defect reasons</div><div className="val">{selected.inspections.defect_reasons?.join(', ')}</div></div>
                    {selected.inspections.defect_desc && <div><div className="k">Note</div><div className="val">{selected.inspections.defect_desc}</div></div>}</>}
                  </div>
                </div>
              </div>
              {selected.inspections?.inspection_photos?.length > 0 && (
                <div className="mt16"><div className="smcap" style={{ marginBottom: 8 }}>Photos ({selected.inspections.inspection_photos.length})</div>
                  <div className="photos">{selected.inspections.inspection_photos.map((ph: any, i: number) => (
                    <a key={i} href={ph.url} target="_blank" rel="noreferrer"><div className="ph">📷</div></a>
                  ))}</div>
                </div>
              )}
              <div className="divider" />
              <div className="between">
                <div className="note">Approving writes the new status to WIMS · logged to audit trail.</div>
                <div className="row">
                  <button className="btn btn-danger" onClick={() => setRejectModal(true)}>Reject</button>
                  <button className="btn btn-success" onClick={() => approve.mutate()} disabled={approve.isPending}>Approve &amp; Write to WIMS</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card card-pad" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondaryText)', minHeight: 200 }}>
              Select an item from the queue
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <Modal title="Reject Status Change" onClose={() => setRejectModal(false)}>
          <div className="bd">
            <div className="field"><label>Rejection reason <span className="req">*</span></label>
              <textarea className="inp fullw" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why the proposed change is rejected…" />
            </div>
          </div>
          <footer>
            <button className="btn btn-outline" onClick={() => setRejectModal(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => reject.mutate()} disabled={!rejectReason || reject.isPending}>Reject</button>
          </footer>
        </Modal>
      )}
    </section>
  )
}
```

- [ ] Wire route: replace approval placeholder with `<ApprovalQueuePage />`
- [ ] Commit: `git add src/features/approval/ src/App.tsx && git commit -m "feat(M4): ApprovalQueuePage"`

### Task 4.3 — ChangeHistoryPage

**Files:**
- Create: `src/features/history/ChangeHistoryPage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchAuditLog } from '../../data/queries'

function exportCSV(rows: any[]) {
  const header = 'Timestamp,SKU,Hub,Old,New,Decision,Decided By'
  const lines = rows.map(r => [
    new Date(r.decided_at).toLocaleString('id-ID'), r.stock?.name ?? r.sku_id,
    r.hub_id, r.old_status, r.new_status, r.state, r.decided_by
  ].join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'change-history.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function ChangeHistoryPage() {
  const { data: log = [] } = useQuery({ queryKey: ['audit_log'], queryFn: fetchAuditLog })
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = log.filter(r =>
    (!search || (r.stock?.name ?? r.sku_id).toLowerCase().includes(search.toLowerCase())) &&
    (!dateFilter || r.decided_at?.startsWith(dateFilter))
  )

  return (
    <section className="admin active" id="adm-history">
      <Topbar crumb="Change History" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div><h1 className="h1">Status Change History</h1><p className="sub mb0">Immutable audit trail of every approved / rejected status change</p></div>
          <button className="btn btn-outline" onClick={() => exportCSV(filtered)}>⬇ Export CSV</button>
        </div>
        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <input className="inp" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Timestamp</th><th>SKU</th><th>Hub</th><th>Old → New</th><th>Decision</th><th>Decided By</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No history yet</td></tr>}
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="muted">{r.decided_at ? new Date(r.decided_at).toLocaleString('id-ID') : '—'}</td>
                  <td><div className="skuname">{r.stock?.name ?? r.sku_id}</div><div className="muted">{r.sku_id}</div></td>
                  <td>{r.hub_id}</td>
                  <td><span className="lab green">{r.old_status}</span> → <span className="lab red">{r.new_status}</span></td>
                  <td><span className={`lab ${r.state === 'Approved' ? 'green' : 'red'}`}>{r.state}</span></td>
                  <td>{r.decided_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
```

- [ ] Wire route: replace history placeholder with `<ChangeHistoryPage />`
- [ ] Commit: `git add src/features/history/ src/App.tsx && git commit -m "feat(M4): ChangeHistoryPage + CSV export"`

---

## M5 — SPV Verification

### Task 5.1 — Verification queries

**Files:**
- Modify: `src/data/queries.ts`

- [ ] Add to `queries.ts`:

```ts
export async function fetchCompletedInspections(hubId?: string) {
  const q = supabase.from('inspections')
    .select('*, stock(name,category)')
    .in('lifecycle_state', ['COMPLETED', 'PENDING_SORT', 'PENDING_APPROVAL'])
  if (hubId) q.eq('hub_id', hubId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data as any[]
}

export async function saveVerification(v: {
  inspection_id: string; spv_id: string; officer_id: string;
  qty_checked: number; sample_qty: number; good_qty: number;
  match_flag: boolean; severity?: string; defect_type?: string;
  defect_qty?: number; wastage_reason?: string;
  compliance_pct: number; band: string;
}) {
  const { data, error } = await supabase.from('verifications').insert(v).select().single()
  if (error) throw error
  return data
}
```

- [ ] Commit: `git add src/data/queries.ts && git commit -m "feat(data): verification queries"`

### Task 5.2 — SpvVerificationPage

**Files:**
- Create: `src/features/verification/SpvVerificationPage.tsx`

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { useAuth } from '../../context/AuthContext'
import { fetchCompletedInspections, saveVerification } from '../../data/queries'
import { compliance, verificationSampleQty } from '../../lib/rules'
import { supabase } from '../../lib/supabase'

const SEVERITIES = ['Minor', 'Major', 'Critical']
const WASTAGE_REASONS = ['Handling — penyimpanan suhu', 'Expired', 'Facility', 'Others']

export function SpvVerificationPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const { data: inspections = [] } = useQuery({
    queryKey: ['completed_inspections', auth.hub?.id],
    queryFn: () => fetchCompletedInspections(auth.hub?.id),
  })
  const [selected, setSelected] = useState<any | null>(null)
  const [goodQty, setGoodQty] = useState(0)
  const [matchFlag, setMatchFlag] = useState<boolean | null>(null)
  const [severity, setSeverity] = useState('Minor')
  const [defectType, setDefectType] = useState('')
  const [defectQty, setDefectQty] = useState(0)
  const [wastageReason, setWastageReason] = useState(WASTAGE_REASONS[0])

  const sampleQty = selected ? verificationSampleQty(selected.sampling_qty) : 0
  const compResult = sampleQty > 0 ? compliance(goodQty, sampleQty) : null

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || matchFlag === null || !compResult) return
      const rec = await saveVerification({
        inspection_id: selected.id,
        spv_id: auth.user!.id,
        officer_id: selected.officer_id,
        qty_checked: selected.sampling_qty,
        sample_qty: sampleQty,
        good_qty: goodQty,
        match_flag: matchFlag,
        severity: matchFlag ? undefined : severity,
        defect_type: matchFlag ? undefined : defectType,
        defect_qty: matchFlag ? undefined : defectQty,
        wastage_reason: matchFlag ? undefined : wastageReason,
        compliance_pct: compResult.pct,
        band: compResult.band,
      })
      if (!matchFlag) {
        await supabase.from('status_changes').insert({
          inspection_id: selected.id,
          sku_id: selected.sku_id,
          hub_id: selected.hub_id,
          old_status: 'Available',
          new_status: 'Bad',
          state: 'Pending',
          source: 'verification',
          submitted_at: new Date().toISOString(),
        })
        await supabase.from('inspections').update({ lifecycle_state: 'RE_INSPECTED' }).eq('id', selected.id)
      } else {
        await supabase.from('inspections').update({ lifecycle_state: 'RE_INSPECTED' }).eq('id', selected.id)
      }
      qc.invalidateQueries({ queryKey: ['completed_inspections'] })
      setSelected(null); setGoodQty(0); setMatchFlag(null)
    },
  })

  return (
    <section className="admin active" id="adm-verify">
      <Topbar crumb="SPV Verification" />
      <div className="page">
        <h1 className="h1">SPV Verification — Re-Inspection</h1>
        <p className="sub">Re-check completed inspections · sample = 20% of qty checked · compliance tracked per officer</p>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: '0 0 320px' }}>
            <div className="pheader">Completed inspections</div>
            <div style={{ padding: '6px 8px' }}>
              {inspections.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--secondaryText)', fontSize: 13 }}>No completed inspections</div>}
              {inspections.map(ins => {
                const isSelected = selected?.id === ins.id
                return (
                  <div key={ins.id} onClick={() => { setSelected(ins); setGoodQty(0); setMatchFlag(null) }} style={{ cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--main)' : 'var(--border)'}`, background: isSelected ? 'var(--mainFaded)' : '#fff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                    <div className="skuname">{ins.stock?.name ?? ins.sku_id}</div>
                    <div className="muted" style={{ marginTop: 3 }}>{ins.officer_id?.slice(0, 8)} · {ins.sampling_qty} checked · {ins.nc_pct?.toFixed(1)}% NC</div>
                  </div>
                )
              })}
            </div>
          </div>

          {selected ? (
            <div className="card card-pad" style={{ flex: 1 }}>
              <div className="between" style={{ marginBottom: 6 }}>
                <div><div className="skuname" style={{ fontSize: 17 }}>{selected.stock?.name ?? selected.sku_id}</div><div className="muted">Officer: {selected.officer_id?.slice(0, 8)}</div></div>
                <span className="lab blue">In Progress</span>
              </div>
              <div className="grid3 mt16">
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22 }}>{selected.sampling_qty}</div><div className="l">Qty checked by officer</div></div>
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22, color: 'var(--main)' }}>{sampleQty}</div><div className="l">Verification sample (20%)</div></div>
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22 }}>{goodQty}</div><div className="l">Good qty (SPV re-check)</div></div>
              </div>
              <div className="formsec mt16">
                <header>Per-SKU result</header>
                <div className="bd">
                  <div className="grid2">
                    <div className="field"><label>Good qty checked <span className="req">*</span></label>
                      <input className="inp fullw" type="number" min={0} max={sampleQty} value={goodQty} onChange={e => setGoodQty(Number(e.target.value))} />
                    </div>
                    <div className="field"><label>Match / Mismatch <span className="req">*</span></label>
                      <div className="row">
                        <span className={`chip ${matchFlag === false ? 'active' : ''}`} style={{ cursor: 'pointer', background: matchFlag === false ? 'var(--orange)' : undefined, borderColor: matchFlag === false ? 'var(--orange)' : undefined, color: matchFlag === false ? '#fff' : undefined }} onClick={() => setMatchFlag(false)}>Mismatch</span>
                        <span className={`chip ${matchFlag === true ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setMatchFlag(true)}>Match</span>
                      </div>
                    </div>
                  </div>
                  {matchFlag === false && (
                    <>
                      <div className="grid2">
                        <div className="field"><label>Severity <span className="req">*</span></label>
                          <select className="inp fullw" value={severity} onChange={e => setSeverity(e.target.value)}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select>
                        </div>
                        <div className="field"><label>Defect qty <span className="req">*</span></label>
                          <input className="inp fullw" type="number" min={0} value={defectQty} onChange={e => setDefectQty(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="field"><label>Defect type <span className="req">*</span></label><input className="inp fullw" value={defectType} onChange={e => setDefectType(e.target.value)} /></div>
                      <div className="field"><label>Wastage reason <span className="req">*</span></label>
                        <select className="inp fullw" value={wastageReason} onChange={e => setWastageReason(e.target.value)}>{WASTAGE_REASONS.map(r => <option key={r}>{r}</option>)}</select>
                      </div>
                      <div className="alert warn mb0"><span className="ic">⚠️</span><div>Mismatch — status change routed to approval queue.</div></div>
                    </>
                  )}
                </div>
              </div>
              {compResult && (
                <div className={`card-pad`} style={{ background: compResult.band === 'PASSED' ? 'var(--tag-green-bg)' : compResult.band === 'PASSED_WITH_NOTE' ? 'var(--tag-orange-bg)' : 'var(--tag-red-bg)', borderRadius: 8 }}>
                  <div className="between">
                    <div>
                      <div className="smcap">{`Compliance = ${goodQty} ÷ ${sampleQty} × 100`}</div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{compResult.pct.toFixed(1)}% — {compResult.band.replace(/_/g, ' ')}</div>
                      <div className="note">{compResult.action}</div>
                    </div>
                    <button className="btn btn-primary lg" onClick={() => save.mutate()} disabled={matchFlag === null || save.isPending}>Save Verification</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card card-pad" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondaryText)', minHeight: 200 }}>
              Select a completed inspection from the list
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] Wire route: replace verification placeholder with `<SpvVerificationPage />`
- [ ] Commit: `git add src/features/verification/ src/App.tsx && git commit -m "feat(M5): SpvVerificationPage"`

---

## M6 — Dashboard (live data) + Status Flow

### Task 6.1 — Dashboard queries

**Files:**
- Modify: `src/data/queries.ts`

- [ ] Add to `queries.ts`:

```ts
export async function fetchDashboardKpis() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [inspRes, pendRes, verifRes] = await Promise.all([
    supabase.from('inspections').select('id,lifecycle_state,hub_id,created_at,nc_pct,decision,sku_id,officer_id,sampling_qty,soh').gte('created_at', today.toISOString()),
    supabase.from('status_changes').select('id,submitted_at').eq('state', 'Pending'),
    supabase.from('verifications').select('compliance_pct,band'),
  ])
  const inspections = inspRes.data ?? []
  const pending = pendRes.data ?? []
  const verifs = verifRes.data ?? []
  const overSla = pending.filter(p => (Date.now() - new Date(p.submitted_at).getTime()) > 15 * 60000).length
  const avgCompliance = verifs.length > 0 ? verifs.reduce((s, v) => s + (v.compliance_pct ?? 0), 0) / verifs.length : 0
  const covTarget = 95
  const metCov = inspections.filter(i => i.nc_pct !== null).length
  const covPct = inspections.length > 0 ? Math.round(metCov / inspections.length * 100) : 0
  const lifecycle: Record<string, number> = {}
  for (const i of inspections) { lifecycle[i.lifecycle_state] = (lifecycle[i.lifecycle_state] ?? 0) + 1 }
  return { inspectionsToday: inspections.length, pendingApprovals: pending.length, overSla, avgCompliance: Math.round(avgCompliance), covPct, lifecycle, inspections }
}

export async function fetchHubProgress(hubIds: string[]) {
  const results: Record<string, { pending: number; inProgress: number; done: number }> = {}
  for (const hub of hubIds) {
    const { data } = await supabase.from('tasks').select('status').eq('hub_id', hub)
    const tasks = data ?? []
    results[hub] = {
      pending: tasks.filter(t => t.status === 'Pending').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      done: tasks.filter(t => t.status === 'Done').length,
    }
  }
  return results
}
```

- [ ] Commit: `git add src/data/queries.ts && git commit -m "feat(data): dashboard KPI queries"`

### Task 6.2 — DashboardPage (live)

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`

- [ ] Replace the placeholder content with live data:

```tsx
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { fetchDashboardKpis, fetchHubProgress, fetchHubs } from '../../data/queries'

const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted', bg: 'var(--mainFaded)', border: '#cfe0f5' },
  { key: 'COMPLETED', label: 'Completed · no change', bg: 'var(--tag-green-bg)', border: '#bce7bd' },
  { key: 'PENDING_SORT', label: 'Sorting 1:1 (6–20%)', bg: 'var(--tag-orange-bg)', border: '#ffd9bd' },
  { key: 'PENDING_APPROVAL', label: 'Pending approval', bg: 'var(--tag-yellow-bg)', border: '#ffe08a' },
  { key: 'APPROVED', label: 'Approved → WMS', bg: '#E8EFFB', border: '#cfe0f5' },
  { key: 'REJECTED', label: 'Rejected', bg: 'var(--tag-red-bg)', border: '#ffc7d2' },
  { key: 'SELECTED', label: 'In verification', bg: 'var(--tag-grey-bg)', border: '#e2e6ee' },
  { key: 'RE_INSPECTED', label: 'Mismatch → approval', bg: '#F0EDF8', border: '#d8cef0' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: kpis, isLoading } = useQuery({ queryKey: ['dashboard_kpis'], queryFn: fetchDashboardKpis, refetchInterval: 5 * 60 * 1000 })
  const { data: hubs = [] } = useQuery({ queryKey: ['hubs'], queryFn: fetchHubs })
  const hubIds = hubs.map(h => h.id)
  const { data: hubProgress = {} } = useQuery({ queryKey: ['hub_progress', hubIds], queryFn: () => fetchHubProgress(hubIds), enabled: hubIds.length > 0 })

  const [period, setPeriod] = useState('This Week')

  return (
    <section className="admin active" id="adm-dashboard">
      <Topbar crumb="Monitoring Dashboard" />
      <div className="page">
        <div className="between" style={{ marginBottom: 20 }}>
          <div><h1 className="h1">Monitoring Dashboard</h1><p className="sub mb0">Real-time inspection progress across hubs · auto-refresh ≤ 5 min</p></div>
          <div className="row">
            <select className="inp" value={period} onChange={e => setPeriod(e.target.value)}>
              <option>This Week</option><option>Today</option><option>This Month</option>
            </select>
            <button className="btn btn-outline">⬇ Export CSV/Excel</button>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi"><div className="v">{isLoading ? '—' : `${kpis?.covPct ?? 0}%`}</div><div className="l">Sampling coverage compliance</div><div className="d" style={{ color: (kpis?.covPct ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>▲ target &gt; 95%</div></div>
          <div className="kpi"><div className="v">{isLoading ? '—' : kpis?.inspectionsToday}</div><div className="l">Inspections today</div><div className="d" style={{ color: 'var(--secondaryText)' }}>across {hubs.length} hubs</div></div>
          <div className="kpi"><div className="v">{isLoading ? '—' : kpis?.pendingApprovals}</div><div className="l">Pending WIMS approvals</div><div className="d" style={{ color: (kpis?.overSla ?? 0) > 0 ? 'var(--red)' : 'var(--success)' }}>{kpis?.overSla ?? 0} over SLA (&gt;15 min)</div></div>
          <div className="kpi"><div className="v">{isLoading ? '—' : `${kpis?.avgCompliance ?? 0}%`}</div><div className="l">SPV verification compliance</div><div className="d" style={{ color: (kpis?.avgCompliance ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>{(kpis?.avgCompliance ?? 0) >= 95 ? 'PASSED band' : 'Below target'}</div></div>
        </div>

        <div className="between" style={{ marginBottom: 12 }}>
          <h3 className="section-title mb0">Inspection lifecycle — this week</h3>
          <a className="note" style={{ color: 'var(--main)', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/app/flow')}>View full status flow →</a>
        </div>
        <div className="lifeflow">
          {LIFECYCLE_STEPS.map(s => (
            <div key={s.key} className="lifestep" style={{ background: s.bg, borderColor: s.border }}>
              <div className="n">{isLoading ? '—' : kpis?.lifecycle?.[s.key] ?? 0}</div>
              <div className="t">{s.label}</div>
            </div>
          ))}
        </div>

        <h3 className="section-title">Per-hub progress</h3>
        <div className="hubgrid">
          {hubs.map(hub => {
            const p = hubProgress[hub.id] ?? { pending: 0, inProgress: 0, done: 0 }
            const total = p.pending + p.inProgress + p.done
            const pct = total > 0 ? Math.round(p.done / total * 100) : 0
            return (
              <div key={hub.id} className="hubcard">
                <div className="between"><div><h4>{hub.name}</h4><div className="loc">{hub.location}</div></div>
                  <span className={`lab ${pct >= 70 ? 'green' : pct >= 50 ? 'yellow' : 'red'}`}>{pct}% done</span>
                </div>
                <div className="bar"><i style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--inprogress)' : 'var(--red)' }} /></div>
                <div className="statline">
                  <span><span className="dot" style={{ background: 'var(--secondaryText)' }} />Pending {p.pending}</span>
                  <span><span className="dot" style={{ background: 'var(--mainV2)' }} />In Progress {p.inProgress}</span>
                  <span><span className="dot" style={{ background: 'var(--success)' }} />Done {p.done}</span>
                </div>
              </div>
            )
          })}
        </div>

        {kpis && kpis.inspections.length > 0 && (
          <>
            <div className="divider" />
            <h3 className="section-title">QC result summary — latest inspections</h3>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Hub</th><th>Officer</th><th>Sampling</th><th>% NC</th><th>Result</th></tr></thead>
                <tbody>
                  {kpis.inspections.slice(0, 10).map(ins => (
                    <tr key={ins.id}>
                      <td><div className="skuname">{ins.sku_id}</div></td>
                      <td>{ins.hub_id}</td>
                      <td>{ins.officer_id?.slice(0, 8)}</td>
                      <td>{ins.sampling_qty} / {ins.soh}</td>
                      <td>{ins.nc_pct?.toFixed(1)}%</td>
                      <td><span className={`lab ${ins.decision === 'Accepted' ? 'green' : ins.decision === 'Conditionally Accepted' ? 'orange' : 'red'}`}>{ins.decision}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
```

- [ ] Add missing `useState` import, add `fetchHubs` to queries import
- [ ] Commit: `git add src/features/dashboard/ && git commit -m "feat(M6): DashboardPage live data"`

### Task 6.3 — StatusFlowPage (SVG embed)

**Files:**
- Create: `src/features/statusFlow/StatusFlowPage.tsx`

- [ ] Copy the SVG block from `qc-apps-html-prototype/index.html` lines 442–533 into a new file:

```tsx
import { Topbar } from '../../components/Topbar'

export function StatusFlowPage() {
  return (
    <section className="admin active" id="adm-flow">
      <Topbar crumb="Inspection Status Flow" />
      <div className="page">
        <h1 className="h1">Inspection Status Flow</h1>
        <p className="sub">The lifecycle every inspection moves through. Approval and Verification are different lanes, not alternatives.</p>
        <div className="alert info"><span className="ic">ℹ️</span><div>Key correction vs an either/or model: <b>Verification ≠ Approval</b>. Most inspections finish with no WMS change at all (Accepted). Only status changes reach the gate.</div></div>
        <div className="flow-wrap">
          {/* paste SVG from prototype index.html lines 442-523 */}
          <svg viewBox="0 0 1120 580" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Nunito Sans',sans-serif", minWidth: 1120, display: 'block' }}>
            {/* SVG CONTENTS FROM PROTOTYPE — copy verbatim */}
          </svg>
        </div>
      </div>
    </section>
  )
}
```

- [ ] Wire route: replace flow placeholder with `<StatusFlowPage />`
- [ ] Run `pnpm build` — must pass
- [ ] Run `pnpm test` — must pass all tests
- [ ] Commit: `git add src/features/statusFlow/ src/App.tsx && git commit -m "feat(M6): StatusFlowPage + complete build"`

---

## Final

- [ ] Push all commits: `git push origin main`
- [ ] Verify Vercel auto-deploy succeeds
- [ ] Run the seed by visiting `/app` after setting up Supabase (trigger `seed.ts` from browser console or add a `/seed` dev route)
