import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchTasksWithOverdue, updateTaskStatus } from '../../data/queries'
import type { TaskInterface } from '../../lib/types'

const PILL_CLS: Record<string, string> = { Pending: '#b0bec5', 'In Progress': '#5579ff', Done: '#43c78f', Overdue: '#ff3d5e' }

export function InboxPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', auth.hub?.id],
    queryFn: () => fetchTasksWithOverdue(auth.hub?.id),
  })

  const myTasks = tasks.filter(t => !t.officer_id || t.officer_id === auth.user?.id)
  const [filter, setFilter] = useState('All')
  const chips = ['All', 'Pending', 'In Progress', 'Overdue']
  const filtered = myTasks.filter(t => filter === 'All' || t.status === filter)
  const active = myTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length

  const handleOpen = (task: TaskInterface & { master_leveling?: { name: string; category: string } }) => {
    if (task.status === 'Pending') {
      updateTaskStatus(task.id, 'In Progress').then(() => qc.invalidateQueries({ queryKey: ['tasks'] }))
    }
    navigate('/app/officer/stock', { state: { task } })
  }

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{auth.hub?.name}</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          Task Inbox {active > 0 && <span style={{ background: '#ff3d5e', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '2px 7px', marginLeft: 6 }}>{active}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', overflowX: 'auto' }}>
        {chips.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{ border: 'none', borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filter === c ? '#291D80' : '#e8edf5', color: filter === c ? '#fff' : '#5a6a84', flexShrink: 0 }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 14px 80px' }}>
        {isLoading && <div style={{ textAlign: 'center', padding: 40, color: '#8999b4', fontSize: 13 }}>Loading…</div>}
        {!isLoading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#8999b4', fontSize: 13 }}>No tasks</div>}
        {filtered.map(t => (
          <div
            key={t.id}
            onClick={() => handleOpen(t)}
            style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', boxShadow: '0 1px 4px rgba(41,29,128,0.07)', border: '1px solid #e8edf5' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1c2540' }}>{t.master_leveling?.name ?? t.sku_id}</div>
              <span style={{ background: t.priority === 'High' ? '#ff3d5e' : t.priority === 'Medium' ? '#ff8c00' : '#8999b4', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '3px 8px' }}>{t.priority}</span>
            </div>
            <div style={{ fontSize: 11, color: '#8999b4', margin: '4px 0 8px' }}>{t.level} · {t.coverage_pct}% coverage</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#5a6a84' }}>
                Due {new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <span style={{ background: PILL_CLS[t.status] ?? '#b0bec5', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '3px 8px' }}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

