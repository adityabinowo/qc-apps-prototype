import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchPriorityListPaged, fetchPriorityListSummary } from '../../data/queries'

const PAGE_SIZE = 50

export function SavedPriorityListPage() {
  const [page, setPage] = useState(0)

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['priority_list_paged', page],
    queryFn: () => fetchPriorityListPaged({ page, pageSize: PAGE_SIZE }),
    placeholderData: prev => prev,
  })

  const { data: summary } = useQuery({
    queryKey: ['priority_list_summary'],
    queryFn: fetchPriorityListSummary,
  })

  const rows = pageData?.rows ?? []
  const total = summary?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const uploadedAt = summary?.uploadedAt
    ? new Date(summary.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <section className="admin active" id="adm-priority-list">
      <Topbar title="Saved Priority List" breadcrumb="QC Task Generator" />
      <div className="page">
        <div style={{ marginBottom: 18 }}>
          <h1 className="h1">Saved Priority List</h1>
          <p className="sub mb0">
            {uploadedAt
              ? <>Current inspection priority list — uploaded <b>{uploadedAt}</b></>
              : 'No priority list yet — run the Priority Generator to create one'}
          </p>
        </div>

        {total > 0 && (
          <div className="kpis" style={{ marginBottom: 20 }}>
            <div className="kpi">
              <div className="v">{total.toLocaleString()}</div>
              <div className="l">Total SKUs</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--tag-red-text, #EC465C)' }}>{summary?.high ?? 0}</div>
              <div className="l">High priority</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--tag-orange-text, #FA591D)' }}>{summary?.medium ?? 0}</div>
              <div className="l">Medium priority</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--secondaryText)' }}>{summary?.low ?? 0}</div>
              <div className="l">Low priority</div>
            </div>
          </div>
        )}

        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 680 }}>
            <thead>
              <tr style={{ verticalAlign: 'bottom' }}>
                <th style={{ minWidth: 160 }}>SKU</th>
                <th style={{ minWidth: 60 }}>Level</th>
                {(['Wastage', 'Inbound', 'Top SKU', 'Complaint'] as const).map(h => (
                  <th key={h} style={{ width: 48, minWidth: 48, padding: '0 4px 10px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{h}</div>
                  </th>
                ))}
                <th style={{ minWidth: 52 }}>Score</th>
                <th style={{ minWidth: 72 }}>Priority</th>
                <th style={{ minWidth: 60 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>
                    No priority list found. Run the Priority Generator to create one.
                  </td>
                </tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className="skuname">{r.master_leveling?.name ?? r.sku_id}</div>
                    <div className="muted">{r.sku_id}</div>
                  </td>
                  <td><b>{r.level}</b></td>
                  <td style={{ textAlign: 'center' }}>{r.param_wastage ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{r.param_inbound ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{r.param_topsku ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{r.param_complaint ?? '—'}</td>
                  <td>
                    <span className={`lab ${r.risk_score >= 4 ? 'red' : r.risk_score === 3 ? 'orange' : 'grey'}`}>{r.risk_score}</span>
                  </td>
                  <td>
                    <span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span>
                  </td>
                  <td>
                    <span className={`lab ${r.status === 'Done' ? 'green' : 'grey'}`}>{r.status}</span>
                  </td>
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
    </section>
  )
}
