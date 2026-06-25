import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchPriorityList, fetchWeeks } from '../../data/queries'

function currentWeek(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export function SavedPriorityListPage() {
  const today = currentWeek()
  const [selectedWeek, setSelectedWeek] = useState(today)

  const { data: weeksFromDb = [] } = useQuery({ queryKey: ['weeks'], queryFn: fetchWeeks })
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['priority_list', selectedWeek],
    queryFn: () => fetchPriorityList(selectedWeek),
  })

  const allWeeks = [...new Set([today, ...weeksFromDb])].sort().reverse()

  const high = rows.filter((r: any) => r.priority === 'High').length
  const med  = rows.filter((r: any) => r.priority === 'Medium').length
  const low  = rows.filter((r: any) => r.priority === 'Low').length

  return (
    <section className="admin active" id="adm-priority-list">
      <Topbar title="Saved Priority List" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Saved Priority List</h1>
            <p className="sub mb0">Generated priority list per week — use this as input for the QC Task Generator</p>
          </div>
          <select
            className="inp"
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
          >
            {allWeeks.map(w => (
              <option key={w} value={w}>Uploaded as per {w}{w === today ? ' (current)' : ''}</option>
            ))}
          </select>
        </div>

        {rows.length > 0 && (
          <div className="kpis" style={{ marginBottom: 20 }}>
            <div className="kpi">
              <div className="v">{rows.length}</div>
              <div className="l">Total SKUs</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--tag-red-text, #EC465C)' }}>{high}</div>
              <div className="l">High priority</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--tag-orange-text, #FA591D)' }}>{med}</div>
              <div className="l">Medium priority</div>
            </div>
            <div className="kpi">
              <div className="v" style={{ color: 'var(--secondaryText)' }}>{low}</div>
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
                    No priority list for {selectedWeek}. Run the Priority Generator to create one.
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
        <p className="note mt16">{rows.length > 0 ? `${rows.length} SKUs · week ${selectedWeek}` : ''}</p>
      </div>
    </section>
  )
}
