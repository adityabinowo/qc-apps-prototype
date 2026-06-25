import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { fetchMasterLevelingPaged, upsertLeveling } from '../../data/queries'
import { coverageForLevel } from '../../lib/rules'
import type { MasterLevelingInterface, LevelType, CategoryType, PriorityType } from '../../lib/types'

const PAGE_SIZE = 50
const LEVELS: LevelType[] = ['LV1', 'LV2', 'LV3']
const CATEGORIES: CategoryType[] = ['Fresh', 'Frozen', 'Dry']
const PRIORITIES: PriorityType[] = ['Low', 'Medium', 'High']

function levelFromScore(score: number): LevelType {
  if (score <= 2) return 'LV1'
  if (score <= 4) return 'LV2'
  return 'LV3'
}

function emptyRow(): Partial<MasterLevelingInterface> {
  return { sku_id: '', name: '', product_id: '', category: 'Fresh', risk_score: 1, priority: 'Low', level: 'LV1', coverage_pct: 20, manual_flag: false }
}

export function MasterLevelingPage() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [lvlFilter, setLvlFilter] = useState('')
  const [priFilter, setPriFilter] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Partial<MasterLevelingInterface> | null>(null)

  const queryKey = ['leveling_paged', page, search, catFilter, lvlFilter, priFilter]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMasterLevelingPaged({ page, pageSize: PAGE_SIZE, search, category: catFilter, level: lvlFilter, priority: priFilter }),
    placeholderData: prev => prev,
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const isNew = editing !== null && !rows.find(r => r.sku_id === editing.sku_id)

  const resetPage = () => setPage(0)

  const save = useMutation({
    mutationFn: (row: Partial<MasterLevelingInterface>) => upsertLeveling(row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leveling_paged'] })
      qc.invalidateQueries({ queryKey: ['leveling'] })
      setEditing(null)
    },
  })

  const handleScoreChange = (score: number) => {
    if (!editing) return
    const level = editing.manual_flag ? editing.level! : levelFromScore(score)
    const priority: PriorityType = score <= 2 ? 'Low' : score <= 4 ? 'Medium' : 'High'
    setEditing({ ...editing, risk_score: score, level, coverage_pct: coverageForLevel(level), priority })
  }

  const handleSave = () => {
    if (!editing?.sku_id || !editing.name) return
    save.mutate(editing)
  }

  return (
    <section className="admin active" id="adm-leveling">
      <Topbar title="Master SKU Leveling" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Master SKU Leveling Database</h1>
            <p className="sub mb0">Single source of truth for risk level &amp; sampling coverage · every edit is change-logged</p>
          </div>
          <button className="btn btn-primary lg" onClick={() => setEditing(emptyRow())}>＋ Add SKU</button>
        </div>

        <div className="alert info">
          <span className="ic">ℹ️</span>
          <div>Any SKU without a record defaults to <b>LV1 (20%)</b>. Escalation to LV2/LV3 is a manual override by PX Quality.</div>
        </div>

        <div className="filterbar">
          <div className="search">
            🔎
            <input
              placeholder="Search SKU, name or product ID…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
            />
          </div>
          <select className="inp" value={catFilter} onChange={e => { setCatFilter(e.target.value); resetPage() }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="inp" value={lvlFilter} onChange={e => { setLvlFilter(e.target.value); resetPage() }}>
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <select className="inp" value={priFilter} onChange={e => { setPriFilter(e.target.value); resetPage() }}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div className="card">
          <table className="tbl">
            <thead>
              <tr><th>SKU</th><th>Product ID</th><th>Category</th><th>Score</th><th>Priority</th><th>Level</th><th>Coverage</th><th>Manual</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>Loading…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No records</td></tr>}
              {rows.map(r => (
                <tr key={r.sku_id}>
                  <td><div className="skuname">{r.name}</div><div className="muted">{r.sku_number ?? '—'}</div></td>
                  <td className="muted">{r.product_id}</td>
                  <td>{r.category}</td>
                  <td><span className={`lab ${r.risk_score >= 4 ? 'red' : r.risk_score === 3 ? 'orange' : 'grey'}`}>{r.risk_score}</span></td>
                  <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                  <td><b>{r.level}</b></td>
                  <td>{r.coverage_pct}%</td>
                  <td><span className={`lab ${r.manual_flag ? 'green' : 'grey'}`}>{r.manual_flag ? 'Yes' : 'No'}</span></td>
                  <td><button className="btn btn-naked sm" onClick={() => setEditing({ ...r })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="between" style={{ marginTop: 12, fontSize: 13, color: 'var(--secondaryText)' }}>
          <span>{total.toLocaleString()} SKUs total · page {page + 1} of {Math.max(totalPages, 1)}</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-outline" disabled={page === 0} onClick={() => setPage(0)}>«</button>
            <button className="btn btn-outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <button className="btn btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
            <button className="btn btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
          </div>
        </div>
      </div>

      <Modal
        open={editing !== null}
        title={isNew ? 'Add SKU Leveling' : 'Edit SKU Leveling'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!editing?.sku_id || !editing?.name || save.isPending}>Save</button>
          </>
        }
      >
        <div className="grid2">
          <div className="field">
            <label>SKU ID <span className="req">*</span></label>
            <input className="inp fullw" value={editing?.sku_id ?? ''} readOnly={!isNew} onChange={e => setEditing(p => ({ ...p, sku_id: e.target.value }))} />
          </div>
          <div className="field">
            <label>Product ID</label>
            <input className="inp fullw" value={editing?.product_id ?? ''} onChange={e => setEditing(p => ({ ...p, product_id: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label>Name <span className="req">*</span></label>
          <input className="inp fullw" value={editing?.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>Category</label>
            <select className="inp fullw" value={editing?.category ?? 'Fresh'} onChange={e => setEditing(p => ({ ...p, category: e.target.value as CategoryType }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Risk Score (0–4)</label>
            <input className="inp fullw" type="number" min={0} max={4} value={editing?.risk_score ?? 0} onChange={e => handleScoreChange(Number(e.target.value))} />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label>Priority</label>
            <select className="inp fullw" value={editing?.priority ?? 'Low'} onChange={e => setEditing(p => ({ ...p, priority: e.target.value as PriorityType }))}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Level</label>
            <select
              className="inp fullw"
              value={editing?.level ?? 'LV1'}
              onChange={e => {
                const l = e.target.value as LevelType
                setEditing(p => ({ ...p, level: l, coverage_pct: coverageForLevel(l), manual_flag: true }))
              }}
            >
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!editing?.manual_flag} onChange={e => setEditing(p => ({ ...p, manual_flag: e.target.checked }))} />
            Manual override (locks level regardless of risk score)
          </label>
        </div>
        <div className="field">
          <label>Coverage % <span className="muted">(auto-computed)</span></label>
          <input className="inp fullw" value={`${editing?.coverage_pct ?? 20}%`} readOnly style={{ color: 'var(--secondaryText)' }} />
        </div>
      </Modal>
    </section>
  )
}
