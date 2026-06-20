import { Topbar } from '../../components/Topbar'

export function DashboardPage() {
  return (
    <section className="admin active" id="adm-dashboard">
      <Topbar title="Monitoring Dashboard" />
      <div className="page">
        <div className="between" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="h1">Monitoring Dashboard</h1>
            <p className="sub mb0">Real-time inspection progress across hubs · auto-refresh ≤ 5 min</p>
          </div>
          <div className="row">
            <select className="inp"><option>This Week</option><option>Today</option><option>This Month</option></select>
            <button className="btn btn-outline">⬇ Export CSV/Excel</button>
          </div>
        </div>

        <div className="alert info" style={{ marginBottom: 24 }}>
          <span className="ic">ℹ️</span>
          <div>
            <b>M0 scaffold complete.</b> Dashboard data will populate in M6 after inspections flow through the system.
            Add tasks (M2), run inspections (M3), approve (M4), and verify (M5) — then come back here.
          </div>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="v">—</div>
            <div className="l">Sampling coverage compliance</div>
            <div className="d" style={{ color: 'var(--secondaryText)' }}>target &gt; 95%</div>
          </div>
          <div className="kpi">
            <div className="v">—</div>
            <div className="l">Inspections today</div>
            <div className="d" style={{ color: 'var(--secondaryText)' }}>across hubs</div>
          </div>
          <div className="kpi">
            <div className="v">—</div>
            <div className="l">Pending WIMS approvals</div>
            <div className="d" style={{ color: 'var(--secondaryText)' }}>SLA &gt; 15 min</div>
          </div>
          <div className="kpi">
            <div className="v">—</div>
            <div className="l">SPV verification compliance</div>
            <div className="d" style={{ color: 'var(--secondaryText)' }}>PASSED band</div>
          </div>
        </div>

        <h3 className="section-title">Inspection lifecycle — this week</h3>
        <div className="lifeflow">
          {[
            { label: 'Submitted', color: 'var(--mainFaded)', border: '#cfe0f5' },
            { label: 'Completed · no change', color: 'var(--tag-green-bg)', border: '#bce7bd' },
            { label: 'Sorting 1:1 (6–20%)', color: 'var(--tag-orange-bg)', border: '#ffd9bd' },
            { label: 'Pending approval', color: 'var(--tag-yellow-bg)', border: '#ffe08a' },
            { label: 'Approved → WMS', color: '#E8EFFB', border: '#cfe0f5' },
            { label: 'Rejected', color: 'var(--tag-red-bg)', border: '#ffc7d2' },
            { label: 'In verification', color: 'var(--tag-grey-bg)', border: '#e2e6ee' },
            { label: 'Mismatch → approval', color: '#F0EDF8', border: '#d8cef0' },
          ].map(s => (
            <div key={s.label} className="lifestep" style={{ background: s.color, borderColor: s.border }}>
              <div className="n">—</div>
              <div className="t">{s.label}</div>
            </div>
          ))}
        </div>

        <h3 className="section-title">Per-hub progress</h3>
        <div className="hubgrid">
          {['Hub Kemang', 'Hub Tebet', 'Hub Pancoran'].map(name => (
            <div key={name} className="hubcard">
              <div className="between">
                <div>
                  <h4>{name}</h4>
                  <div className="loc">South Jakarta</div>
                </div>
                <span className="lab grey">No data yet</span>
              </div>
              <div className="bar"><i style={{ width: '0%' }} /></div>
              <div className="statline">
                <span><span className="dot" style={{ background: 'var(--secondaryText)' }} />Pending —</span>
                <span><span className="dot" style={{ background: 'var(--mainV2)' }} />In Progress —</span>
                <span><span className="dot" style={{ background: 'var(--success)' }} />Done —</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
