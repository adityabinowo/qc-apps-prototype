import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import {
  fetchTasksWithOverdue, createTask, fetchStock, fetchUsers,
  fetchMasterLeveling, bulkInsertTasks, assignOfficerBulk,
} from '../../data/queries'
import { coverageForLevel } from '../../lib/rules'
import type { LevelType, PriorityType } from '../../lib/types'

const STATUS_LAB: Record<string, string> = { Pending: 'grey', 'In Progress': 'blue', Done: 'green', Overdue: 'red' }
const PRIORITIES: PriorityType[] = ['Low', 'Medium', 'High']
const LEVELS: LevelType[] = ['LV1', 'LV2', 'LV3']

function defaultDeadline() {
  const d = new Date(); d.setHours(18, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

type TaskForm = { sku_id: string; priority: PriorityType; level: LevelType; deadline: string; instructions: string }

interface BulkRow {
  product_id: string
  hub_id: string
  deadline: string
  instructions: string
  name?: string
  priority?: PriorityType
  level?: LevelType
  coverage_pct?: number
}

function parseBulkFile(file: File): Promise<BulkRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
        const rows: BulkRow[] = raw
          .map(r => ({
            product_id: String(r['product_id'] ?? r['Product ID'] ?? '').trim(),
            hub_id: String(r['hub_id'] ?? r['Hub ID'] ?? '').trim(),
            deadline: String(r['deadline'] ?? r['Deadline'] ?? '').trim(),
            instructions: String(r['instructions'] ?? r['Instructions'] ?? '').trim(),
          }))
          .filter(r => r.product_id !== '' && r.hub_id !== '')
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['product_id', 'hub_id', 'deadline', 'instructions'],
    ['SKU-001', 'HUB-JKT', '2026-06-23 18:00', 'Check expiry carefully'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks')
  XLSX.writeFile(wb, 'bulk_task_template.xlsx')
}

export function TaskManagementPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const hubId = auth.hub?.id
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks', hubId], queryFn: () => fetchTasksWithOverdue(hubId) })
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: () => fetchStock() })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: leveling = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchMasterLeveling })
  const officers = users.filter(u => u.role === 'officer')

  const levelingMap = new Map(leveling.map(l => [l.sku_id, l]))
  const stockMap = new Map(stock.map(s => [s.sku_id, s]))

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Create task modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<TaskForm>({ sku_id: '', priority: 'Medium', level: 'LV1', deadline: defaultDeadline(), instructions: '' })

  // Bulk upload modal
  const [showBulk, setShowBulk] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[] | null>(null)
  const [bulkFileName, setBulkFileName] = useState('')
  const [bulkError, setBulkError] = useState('')

  // Bulk assign
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignOfficerId, setAssignOfficerId] = useState('')

  const filtered = tasks.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    (!search || t.master_leveling?.name?.toLowerCase().includes(search.toLowerCase())),
  )
  const pendingUnassigned = filtered.filter(t => t.status === 'Pending' && !t.officer_id)
  const allSelected = pendingUnassigned.length > 0 && pendingUnassigned.every(t => selected.has(t.id))

  const toggleRow = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(pendingUnassigned.map(t => t.id)))

  // Create task mutation
  const save = useMutation({
    mutationFn: () =>
      createTask({
        sku_id: form.sku_id,
        hub_id: hubId!,
        officer_id: null,
        priority: form.priority,
        level: form.level,
        coverage_pct: coverageForLevel(form.level),
        deadline: new Date(form.deadline).toISOString(),
        instructions: form.instructions,
        status: 'Pending',
        source: 'manual',
        created_by: auth.user!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowCreate(false)
      setForm({ sku_id: '', priority: 'Medium', level: 'LV1', deadline: defaultDeadline(), instructions: '' })
    },
  })

  // Bulk upload mutation
  const runBulk = useMutation({
    mutationFn: async () => {
      if (!bulkRows) return
      const now = defaultDeadline()
      const rows = bulkRows.map(r => ({
        sku_id: r.product_id,
        hub_id: r.hub_id || hubId!,
        officer_id: null as string | null,
        priority: r.priority ?? ('Low' as PriorityType),
        level: r.level ?? ('LV1' as LevelType),
        coverage_pct: r.coverage_pct ?? 20,
        deadline: r.deadline ? new Date(r.deadline).toISOString() : new Date(now).toISOString(),
        instructions: r.instructions,
        status: 'Pending' as const,
        source: 'bulk' as const,
        created_by: auth.user!.id,
      }))
      await bulkInsertTasks(rows)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowBulk(false)
      setBulkRows(null)
      setBulkFileName('')
    },
  })

  // Assign officer mutation
  const doAssign = useMutation({
    mutationFn: () => assignOfficerBulk([...selected], assignOfficerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setSelected(new Set())
      setAssignOfficerId('')
    },
  })

  const handleBulkFile = async (file: File) => {
    setBulkError('')
    setBulkRows(null)
    setBulkFileName(file.name)
    try {
      const rows = await parseBulkFile(file)
      if (rows.length === 0) { setBulkError('No valid rows found (need product_id and hub_id).'); return }
      // Enrich from master_leveling and stock
      const enriched = rows.map(r => {
        const lv = levelingMap.get(r.product_id)
        const st = stockMap.get(r.product_id)
        return {
          ...r,
          name: st?.name ?? lv?.name,
          priority: lv?.priority ?? 'Low' as PriorityType,
          level: lv?.level ?? 'LV1' as LevelType,
          coverage_pct: lv?.coverage_pct ?? 20,
        }
      })
      setBulkRows(enriched)
    } catch {
      setBulkError('Failed to parse file. Make sure it is a valid .xlsx or .csv.')
    }
  }

  return (
    <section className="admin active" id="adm-tasks">
      <Topbar title="Task Management" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Task Management</h1>
            <p className="sub mb0">Create &amp; assign daily inspection tasks · overdue detection at deadline</p>
          </div>
          <div className="row">
            <button className="btn btn-outline lg" onClick={() => setShowBulk(true)}>📥 Bulk Upload</button>
            <button className="btn btn-primary lg" onClick={() => setShowCreate(true)}>＋ Create Task</button>
          </div>
        </div>

        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          {['All', 'Pending', 'In Progress', 'Done', 'Overdue'].map(s => (
            <span key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(s)}>{s}</span>
          ))}
        </div>

        {/* Assign bar */}
        {selected.size > 0 && (
          <div className="card card-pad" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--mainFaded)', border: '1.5px solid var(--main)' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{selected.size} task(s) selected</span>
            <select
              className="inp"
              style={{ flex: 1, maxWidth: 220 }}
              value={assignOfficerId}
              onChange={e => setAssignOfficerId(e.target.value)}
            >
              <option value="">Pick officer…</option>
              {officers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button
              className="btn btn-primary"
              disabled={!assignOfficerId || doAssign.isPending}
              onClick={() => doAssign.mutate()}
            >
              {doAssign.isPending ? 'Assigning…' : 'Assign Officer'}
            </button>
            <button className="btn btn-outline" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={pendingUnassigned.length === 0}
                    onChange={toggleAll}
                    title="Select all pending unassigned"
                  />
                </th>
                <th>Task ID</th><th>SKU</th><th>Priority</th><th>Level</th><th>Officer</th><th>Deadline</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No tasks</td></tr>}
              {filtered.map(t => {
                const isSelectable = t.status === 'Pending' && !t.officer_id
                return (
                  <tr key={t.id} style={{ background: selected.has(t.id) ? 'var(--mainFaded)' : undefined }}>
                    <td>
                      {isSelectable && (
                        <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleRow(t.id)} />
                      )}
                    </td>
                    <td className="muted">{t.id.slice(0, 8).toUpperCase()}</td>
                    <td><div className="skuname">{t.master_leveling?.name ?? t.sku_id}</div><div className="muted">{t.sku_id}</div></td>
                    <td><span className={`lab ${t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'orange' : 'grey'}`}>{t.priority}</span></td>
                    <td>{t.level} · {t.coverage_pct}%</td>
                    <td>{officers.find(u => u.id === t.officer_id)?.name ?? <span className="muted">Unassigned</span>}</td>
                    <td className="muted">{new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className={`lab ${STATUS_LAB[t.status] ?? 'grey'}`}>{t.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task modal */}
      <Modal
        open={showCreate}
        title="Create Task"
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => save.mutate()} disabled={!form.sku_id || save.isPending}>
              {save.isPending ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>SKU <span className="req">*</span></label>
          <select className="inp fullw" value={form.sku_id} onChange={e => setForm(f => ({ ...f, sku_id: e.target.value }))}>
            <option value="">Select SKU…</option>
            {stock.map(s => <option key={s.sku_id} value={s.sku_id}>{s.name} ({s.sku_id})</option>)}
          </select>
        </div>
        <div className="grid2">
          <div className="field">
            <label>Priority</label>
            <select className="inp fullw" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as PriorityType }))}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Level</label>
            <select className="inp fullw" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as LevelType }))}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Deadline</label>
          <input className="inp fullw" type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
        </div>
        <div className="field">
          <label>Instructions (optional, ≤ 500 chars)</label>
          <textarea className="inp fullw" maxLength={500} rows={3} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Tasks are created unassigned — assign officers via the bulk-assign action in the table.</p>
      </Modal>

      {/* Bulk Upload modal */}
      <Modal
        open={showBulk}
        title="Bulk Upload Tasks"
        onClose={() => { setShowBulk(false); setBulkRows(null); setBulkFileName(''); setBulkError('') }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setShowBulk(false); setBulkRows(null); setBulkFileName(''); setBulkError('') }}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!bulkRows || bulkRows.length === 0 || runBulk.isPending}
              onClick={() => runBulk.mutate()}
            >
              {runBulk.isPending ? 'Uploading…' : `Upload ${bulkRows?.length ?? 0} tasks`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>Columns: <b>product_id · hub_id · deadline · instructions</b> (last two optional)</span>
          <button className="btn btn-outline" style={{ fontSize: 11 }} onClick={downloadTemplate}>↓ Template</button>
        </div>

        <input ref={bulkFileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFile(f) }} />
        <div
          className="card card-pad"
          style={{ cursor: 'pointer', textAlign: 'center', border: '2px dashed var(--border)', marginBottom: 12 }}
          onClick={() => bulkFileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBulkFile(f) }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
          <div style={{ fontWeight: 700 }}>{bulkFileName || 'Click or drag & drop to upload'}</div>
          {bulkRows && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{bulkRows.length} rows parsed</div>}
          {!bulkRows && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Accepts .xlsx · .csv</div>}
        </div>

        {bulkError && <div className="alert warn" style={{ marginBottom: 10 }}><span className="ic">⚠️</span><div>{bulkError}</div></div>}

        {bulkRows && bulkRows.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: 260 }}>
            <table className="tbl" style={{ minWidth: 500 }}>
              <thead>
                <tr><th>SKU</th><th>Hub</th><th>Priority</th><th>Level</th><th>Deadline</th></tr>
              </thead>
              <tbody>
                {bulkRows.map((r, i) => (
                  <tr key={i}>
                    <td><div className="skuname">{r.name ?? r.product_id}</div><div className="muted">{r.product_id}</div></td>
                    <td className="muted">{r.hub_id}</td>
                    <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority ?? '—'}</span></td>
                    <td>{r.level ?? '—'}</td>
                    <td className="muted">{r.deadline || 'today 18:00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  )
}

