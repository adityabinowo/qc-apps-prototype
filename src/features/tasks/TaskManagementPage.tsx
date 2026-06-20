import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { fetchTasksWithOverdue, createTask, fetchStock, fetchUsers } from '../../data/queries'
import { coverageForLevel } from '../../lib/rules'
import type { LevelType, PriorityType } from '../../lib/types'

const STATUS_LAB: Record<string, string> = { Pending: 'grey', 'In Progress': 'blue', Done: 'green', Overdue: 'red' }
const PRIORITIES: PriorityType[] = ['Low', 'Medium', 'High']
const LEVELS: LevelType[] = ['LV1', 'LV2', 'LV3']

function defaultDeadline() {
  const d = new Date(); d.setHours(18, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

type TaskForm = { sku_id: string; officer_id: string; priority: PriorityType; level: LevelType; deadline: string; instructions: string }

export function TaskManagementPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const hubId = auth.hub?.id

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks', hubId], queryFn: () => fetchTasksWithOverdue(hubId) })
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: () => fetchStock() })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const officers = users.filter(u => u.role === 'officer')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<TaskForm>({ sku_id: '', officer_id: '', priority: 'Medium', level: 'LV1', deadline: defaultDeadline(), instructions: '' })

  const save = useMutation({
    mutationFn: () =>
      createTask({
        sku_id: form.sku_id,
        hub_id: hubId!,
        officer_id: form.officer_id || null,
        priority: form.priority,
        level: form.level,
        coverage_pct: coverageForLevel(form.level),
        deadline: new Date(form.deadline).toISOString(),
        instructions: form.instructions,
        status: 'Pending',
        created_by: auth.user!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowCreate(false)
      setForm({ sku_id: '', officer_id: '', priority: 'Medium', level: 'LV1', deadline: defaultDeadline(), instructions: '' })
    },
  })

  const filtered = tasks.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    (!search || t.stock?.name?.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <section className="admin active" id="adm-tasks">
      <Topbar title="Task Management" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Task Management</h1>
            <p className="sub mb0">Create &amp; assign daily inspection tasks · overdue detection at deadline</p>
          </div>
          <button className="btn btn-primary lg" onClick={() => setShowCreate(true)}>＋ Create Task</button>
        </div>
        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          {['All', 'Pending', 'In Progress', 'Done', 'Overdue'].map(s => (
            <span key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(s)}>{s}</span>
          ))}
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Task ID</th><th>SKU</th><th>Priority</th><th>Level</th><th>Officer</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No tasks</td></tr>}
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="muted">{t.id.slice(0, 8).toUpperCase()}</td>
                  <td><div className="skuname">{t.stock?.name ?? t.sku_id}</div><div className="muted">{t.sku_id}</div></td>
                  <td><span className={`lab ${t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'orange' : 'grey'}`}>{t.priority}</span></td>
                  <td>{t.level} · {t.coverage_pct}%</td>
                  <td>{officers.find(u => u.id === t.officer_id)?.name ?? <span className="muted">Any officer</span>}</td>
                  <td className="muted">{new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className={`lab ${STATUS_LAB[t.status] ?? 'grey'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showCreate}
        title="Create Task"
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => save.mutate()} disabled={!form.sku_id || save.isPending}>Create</button>
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
        <div className="grid2">
          <div className="field">
            <label>Assign to officer (optional)</label>
            <select className="inp fullw" value={form.officer_id} onChange={e => setForm(f => ({ ...f, officer_id: e.target.value }))}>
              <option value="">Any officer</option>
              {officers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Deadline</label>
            <input className="inp fullw" type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label>Instructions (optional, ≤ 500 chars)</label>
          <textarea className="inp fullw" maxLength={500} rows={3} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
        </div>
      </Modal>
    </section>
  )
}
