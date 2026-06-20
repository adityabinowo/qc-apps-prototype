import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchAuditLog } from '../../data/queries'

function exportCSV(rows: any[]) {
  const header = 'Timestamp,SKU,Hub,Old Status,New Status,Decision,Decided By'
  const lines = rows.map(r => [
    r.decided_at ? new Date(r.decided_at).toLocaleString('id-ID') : '',
    r.stock?.name ?? r.sku_id,
    r.hub_id,
    r.old_status,
    r.new_status,
    r.state,
    r.decided_by ?? '',
  ].join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'change-history.csv'
  a.click(); URL.revokeObjectURL(url)
}

export function ChangeHistoryPage() {
  const { data: log = [], isLoading } = useQuery({ queryKey: ['audit_log'], queryFn: fetchAuditLog })
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('All')

  const filtered = (log as any[]).filter(r =>
    (decisionFilter === 'All' || r.state === decisionFilter) &&
    (!search || (r.stock?.name ?? r.sku_id).toLowerCase().includes(search.toLowerCase())) &&
    (!dateFilter || r.decided_at?.startsWith(dateFilter)),
  )

  return (
    <section className="admin active" id="adm-history">
      <Topbar title="Change History" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Status Change History</h1>
            <p className="sub mb0">Immutable audit trail of every approved / rejected status change</p>
          </div>
          <button className="btn btn-outline" onClick={() => exportCSV(filtered)}>⬇ Export CSV</button>
        </div>
        <div className="filterbar">
          <div className="search">🔎<input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <input className="inp" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          {['All', 'Approved', 'Rejected'].map(d => (
            <span key={d} className={`chip ${decisionFilter === d ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setDecisionFilter(d)}>{d}</span>
          ))}
        </div>
        <div className="card">
          <table className="tbl">
            <thead>
              <tr><th>Timestamp</th><th>SKU</th><th>Hub</th><th>Old → New</th><th>Decision</th><th>Decided By</th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No history yet</td></tr>}
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td className="muted">{r.decided_at ? new Date(r.decided_at).toLocaleString('id-ID') : '—'}</td>
                  <td><div className="skuname">{r.stock?.name ?? r.sku_id}</div><div className="muted">{r.sku_id}</div></td>
                  <td>{r.hub_id}</td>
                  <td>
                    <span className="lab green">{r.old_status}</span>
                    <span style={{ color: 'var(--secondaryText)', margin: '0 4px' }}>→</span>
                    <span className="lab red">{r.new_status}</span>
                  </td>
                  <td><span className={`lab ${r.state === 'Approved' ? 'green' : 'red'}`}>{r.state}</span></td>
                  <td className="muted">{r.decided_by ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
