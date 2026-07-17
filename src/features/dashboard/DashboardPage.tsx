import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { fetchDashboardKpis, fetchHubProgress, fetchHubs } from '../../data/queries'

const MAIN_STEPS = [
  { key: 'SUBMITTED',        label: 'Submitted',            bg: 'var(--mainFaded)',       border: '#cfe0f5', src: 'lifecycle' },
  { key: 'COMPLETED',        label: 'Completed · no change', bg: 'var(--tag-green-bg)',   border: '#bce7bd', src: 'lifecycle' },
  { key: 'PENDING_SORT',     label: 'Sorting 1:1',          bg: 'var(--tag-orange-bg)',   border: '#ffd9bd', src: 'lifecycle' },
  { key: 'PENDING_APPROVAL', label: 'Pending approval',     bg: 'var(--tag-yellow-bg)',   border: '#ffe08a', src: 'lifecycle' },
  { key: 'APPROVED',         label: 'Approved → WMS',       bg: '#E8EFFB',               border: '#cfe0f5', src: 'lifecycle' },
  { key: 'REJECTED',         label: 'Rejected',             bg: 'var(--tag-red-bg)',      border: '#ffc7d2', src: 'lifecycle' },
]

const VERIF_BAND_LAB: Record<string, string> = { PASSED: 'green', PASSED_WITH_NOTE: 'yellow', NOT_PASSED: 'red' }

const STATE_LABELS: Record<string, string> = Object.fromEntries(
  [...MAIN_STEPS, { key: 'RE_INSPECTED', label: 'Re-inspected (Match)' }, { key: 'MISMATCH_APPROVAL', label: 'Mismatch → approval' }]
    .map(s => [s.key, s.label]),
)

const VERIF_STEPS = [
  { key: 'SELECTED',          label: 'Selected',              bg: '#F0EDF8',               border: '#d8cef0', src: 'lifecycle' },
  { key: 'RE_INSPECTED',      label: 'Re-inspected (Match)',  bg: 'var(--tag-green-bg)',   border: '#bce7bd', src: 'lifecycle' },
  { key: 'MISMATCH_APPROVAL', label: 'Mismatch → approval',  bg: 'var(--tag-orange-bg)',  border: '#ffd9bd', src: 'lifecycle' },
  { key: 'PASSED',            label: 'PASSED',               bg: 'var(--tag-green-bg)',   border: '#bce7bd', src: 'band' },
  { key: 'PASSED_WITH_NOTE',  label: 'PASSED w/ note',       bg: 'var(--tag-yellow-bg)',  border: '#ffe08a', src: 'band' },
  { key: 'NOT_PASSED',        label: 'NOT PASSED',           bg: 'var(--tag-red-bg)',     border: '#ffc7d2', src: 'band' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<'Today' | 'This Week' | 'This Month'>('This Week')

  const { data: kpis, isLoading, error: kpisError } = useQuery({
    queryKey: ['dashboard_kpis', period],
    queryFn: () => fetchDashboardKpis(period),
    staleTime: 0,
    refetchInterval: 5 * 60 * 1000,
  })
  const { data: hubs = [] } = useQuery({ queryKey: ['hubs'], queryFn: fetchHubs })
  const hubIds = hubs.map(h => h.id)
  const { data: hubProgress = {} } = useQuery({
    queryKey: ['hub_progress', hubIds],
    queryFn: () => fetchHubProgress(hubIds),
    enabled: hubIds.length > 0,
  })

  return (
    <section className="admin active" id="adm-dashboard">
      <Topbar title="Monitoring Dashboard" />
      <div className="page">
        <div className="between" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="h1">Monitoring Dashboard</h1>
            <p className="sub mb0">Real-time inspection progress across hubs · auto-refresh every 5 min</p>
          </div>
          <div className="row">
            <select className="inp" value={period} onChange={e => setPeriod(e.target.value as typeof period)}>
              <option>This Week</option><option>Today</option><option>This Month</option>
            </select>
            <button className="btn btn-outline">⬇ Export CSV/Excel</button>
          </div>
        </div>

        {kpisError && (
          <div className="alert err" style={{ marginBottom: 16 }}>
            <span className="ic">⚠️</span>
            <div><b>Couldn't load dashboard data.</b> {kpisError instanceof Error ? kpisError.message : String((kpisError as { message?: string })?.message ?? kpisError)}</div>
          </div>
        )}

        <div className="kpis">
          <div className="kpi">
            <div className="v" style={{ color: (kpis?.covPct ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>{isLoading ? '—' : `${kpis?.covPct ?? 0}%`}</div>
            <div className="l">Sampling coverage compliance</div>
            <div className="d" style={{ color: (kpis?.covPct ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>target &gt; 95%</div>
          </div>
          <div className="kpi">
            <div className="v">{isLoading ? '—' : kpis?.inspectionsToday ?? 0}</div>
            <div className="l">Inspections {period.toLowerCase()}</div>
            <div className="d" style={{ color: 'var(--secondaryText)' }}>across {hubs.length} hubs</div>
          </div>
          <div className="kpi">
            <div className="v" style={{ color: (kpis?.overSla ?? 0) > 0 ? 'var(--red)' : undefined }}>{isLoading ? '—' : kpis?.pendingApprovals ?? 0}</div>
            <div className="l">Pending WIMS approvals</div>
            <div className="d" style={{ color: (kpis?.overSla ?? 0) > 0 ? 'var(--red)' : 'var(--secondaryText)' }}>
              {isLoading ? '—' : `${kpis?.overSla ?? 0} over SLA (>15 min)`}
            </div>
          </div>
          <div className="kpi">
            <div className="v" style={{ color: (kpis?.avgCompliance ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>{isLoading ? '—' : `${kpis?.avgCompliance ?? 0}%`}</div>
            <div className="l">SPV verification compliance</div>
            <div className="d" style={{ color: (kpis?.avgCompliance ?? 0) >= 95 ? 'var(--success)' : 'var(--red)' }}>
              {(kpis?.avgCompliance ?? 0) >= 95 ? 'PASSED band' : 'Below target'}
            </div>
          </div>
        </div>

        <div className="between" style={{ marginBottom: 12 }}>
          <h3 className="section-title mb0">Inspection lifecycle — {period.toLowerCase()}</h3>
          <button className="btn btn-naked" onClick={() => navigate('/app/flow')}>View full flow →</button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondaryText)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Main Pipeline</div>
        <div className="lifeflow" style={{ marginBottom: 18 }}>
          {MAIN_STEPS.map(s => (
            <div key={s.key} className="lifestep" style={{ background: s.bg, borderColor: s.border }}>
              <div className="n">{isLoading ? '—' : kpis?.lifecycle?.[s.key] ?? 0}</div>
              <div className="t">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondaryText)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Verification Pipeline</div>
        <div className="lifeflow">
          {VERIF_STEPS.map(s => {
            const count = isLoading ? '—' : s.src === 'band'
              ? (kpis?.verificationBands?.[s.key] ?? 0)
              : (kpis?.lifecycle?.[s.key] ?? 0)
            return (
              <div key={s.key} className="lifestep" style={{ background: s.bg, borderColor: s.border }}>
                <div className="n">{count}</div>
                <div className="t">{s.label}</div>
              </div>
            )
          })}
        </div>

        <h3 className="section-title">Per-hub progress</h3>
        <div className="hubgrid">
          {hubs.length === 0 && !isLoading && (
            <div style={{ gridColumn: '1/-1', color: 'var(--secondaryText)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No hub data yet — run the schema seed in Supabase
            </div>
          )}
          {hubs.map(hub => {
            const p = hubProgress[hub.id] ?? { pending: 0, inProgress: 0, done: 0 }
            const total = p.pending + p.inProgress + p.done
            const pct = total > 0 ? Math.round(p.done / total * 100) : 0
            return (
              <div key={hub.id} className="hubcard">
                <div className="between">
                  <div><h4>{hub.name}</h4><div className="loc">{hub.location}</div></div>
                  <span className={`lab ${pct >= 70 ? 'green' : pct >= 50 ? 'yellow' : total === 0 ? 'grey' : 'red'}`}>
                    {total === 0 ? 'No data' : `${pct}% done`}
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--success)' : pct >= 50 ? '#ff8c00' : 'var(--red)' }} />
                </div>
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
            <h3 className="section-title">QC results — {period.toLowerCase()} ({kpis.inspections.length} inspections)</h3>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 980 }}>
                <thead><tr>
                  <th>SKU</th><th>Hub</th><th>Sampling</th><th>% NC</th><th>Result</th>
                  <th>Officer accuracy</th><th>Stock condition</th><th>Avail → Bad</th><th>State</th>
                </tr></thead>
                <tbody>
                  {(kpis.inspections as any[]).slice(0, 10).map((ins: any) => {
                    const verification = ins.verifications?.[0]
                    const statusChange = ins.status_changes?.[0]
                    return (
                      <tr key={ins.id}>
                        <td className="skuname">{ins.sku_id}</td>
                        <td>{ins.hub_id}</td>
                        <td>{ins.sampling_qty}/{ins.soh}</td>
                        <td>{Number(ins.nc_pct).toFixed(1)}%</td>
                        <td><span className={`lab ${ins.decision === 'Accepted' ? 'green' : ins.decision === 'Conditionally Accepted' ? 'orange' : 'red'}`}>{ins.decision}</span></td>
                        <td>
                          {verification
                            ? <span className={`lab ${VERIF_BAND_LAB[verification.band] ?? 'grey'}`}>{verification.band.replace(/_/g, ' ')} · {verification.compliance_pct}%</span>
                            : <span className="muted">— not verified</span>}
                        </td>
                        <td>
                          {verification
                            ? <span className={`lab ${verification.match_flag ? 'green' : 'orange'}`}>{verification.match_flag ? 'Match' : 'Mismatch'}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          {statusChange?.state === 'Approved' && statusChange.qty_changed != null
                            ? <b style={{ color: 'var(--red)' }}>{statusChange.qty_changed} pcs</b>
                            : <span className="muted">—</span>}
                        </td>
                        <td><span className="lab grey">{STATE_LABELS[ins.lifecycle_state] ?? ins.lifecycle_state}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
