import { Topbar } from '../../components/Topbar'

const STATES = [
  { id: 'SUBMITTED', label: 'Submitted', color: '#E8EFFB', border: '#cfe0f5', description: 'Officer submits inspection result' },
  { id: 'COMPLETED', label: 'Completed', color: '#E6F9EF', border: '#bce7bd', description: 'Accepted (0–5% NC) — no WMS change needed' },
  { id: 'PENDING_SORT', label: 'Pending Sort', color: '#FFF8E6', border: '#ffe08a', description: 'Cond. Accepted (6–20% NC) — 1:1 sorting required' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval', color: '#FFF0F3', border: '#ffc7d2', description: 'Quarantine All (>20% NC) or early stop — awaits SPV/PX approval' },
  { id: 'APPROVED', label: 'Approved', color: '#E6F9EF', border: '#bce7bd', description: 'SPV/PX approved the status change' },
  { id: 'WMS_WRITTEN', label: 'WMS Written', color: '#E8EFFB', border: '#cfe0f5', description: 'Stock status written to WIMS — terminal state' },
  { id: 'REJECTED', label: 'Rejected', color: '#FFF0F3', border: '#ffc7d2', description: 'Status change rejected — stock stays Available' },
]

const VERIF_STATES = [
  { id: 'SELECTED', label: 'Selected', color: 'var(--tag-grey-bg)', border: '#e2e6ee', description: 'SPV selects completed inspection for re-check' },
  { id: 'RE_INSPECTED', label: 'Re-Inspected', color: '#F0EDF8', border: '#d8cef0', description: 'SPV records verification result. Match → done. Mismatch → new status_change to approval.' },
]

const TRANSITIONS = [
  { from: 'SUBMITTED', to: 'COMPLETED', label: '0–5% NC', color: '#43c78f' },
  { from: 'SUBMITTED', to: 'PENDING_SORT', label: '6–20% NC', color: '#ff8c00' },
  { from: 'SUBMITTED', to: 'PENDING_APPROVAL', label: '>20% or early stop', color: '#ff3d5e' },
  { from: 'PENDING_SORT', to: 'PENDING_APPROVAL', label: 'Sort done → status change', color: '#ff8c00' },
  { from: 'PENDING_APPROVAL', to: 'APPROVED', label: 'SPV/PX approves', color: '#43c78f' },
  { from: 'PENDING_APPROVAL', to: 'REJECTED', label: 'SPV/PX rejects', color: '#ff3d5e' },
  { from: 'APPROVED', to: 'WMS_WRITTEN', label: 'WIMS write confirmed', color: '#291D80' },
]

export function StatusFlowPage() {
  return (
    <section className="admin active" id="adm-flow">
      <Topbar title="Inspection Status Flow" />
      <div className="page">
        <h1 className="h1">Inspection Status Flow</h1>
        <p className="sub">The lifecycle every inspection moves through. Verification is a separate lane — it re-checks completed inspections, not a replacement for approval.</p>
        <div className="alert info">
          <span className="ic">ℹ️</span>
          <div>
            <b>Key correction vs an either/or model:</b> Verification ≠ Approval.
            Most inspections finish as <b>Completed</b> (no WMS change at all).
            Only bad-batch findings reach the Approval gate. Verification re-checks <em>officer accuracy</em>, independently.
          </div>
        </div>

        <h3 className="section-title">Main Inspection Lane</h3>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 780 }}>
            {STATES.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ background: s.color, border: `1.5px solid ${s.border}`, borderRadius: 10, padding: '12px 14px', minWidth: 130, maxWidth: 150 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#1c2540', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#5a6a84', lineHeight: 1.4 }}>{s.description}</div>
                </div>
                {i < STATES.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', marginTop: 16 }}>
                    <div style={{ width: 24, height: 2, background: '#d8e2ec' }} />
                    <div style={{ fontSize: 10, color: '#8999b4' }}>›</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Transitions (decision rules)</h3>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>From</th><th>To</th><th>Trigger</th></tr></thead>
            <tbody>
              {TRANSITIONS.map((t, i) => (
                <tr key={i}>
                  <td><span className="lab grey">{t.from}</span></td>
                  <td><span className="lab" style={{ background: t.color + '22', color: t.color, border: `1px solid ${t.color}55` }}>{t.to}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--secondaryText)' }}>{t.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Verification Lane (independent)</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {VERIF_STATES.map(s => (
            <div key={s.id} style={{ background: s.color, border: `1.5px solid ${s.border}`, borderRadius: 10, padding: '12px 16px', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#1c2540', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#5a6a84', lineHeight: 1.4 }}>{s.description}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, background: '#F0EDF8', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📐 Decision Bands (configurable)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { band: 'Accepted', range: '0–5% NC', action: 'No change. Lifecycle → COMPLETED.', color: 'var(--tag-green-bg)', border: '#bce7bd' },
              { band: 'Cond. Accepted', range: '6–20% NC', action: '1:1 sort bad units. Lifecycle → PENDING_SORT.', color: 'var(--tag-orange-bg)', border: '#ffd9bd' },
              { band: 'Quarantine All', range: '>20% NC or early stop', action: 'Entire batch. Lifecycle → PENDING_APPROVAL.', color: 'var(--tag-red-bg)', border: '#ffc7d2' },
            ].map(b => (
              <div key={b.band} style={{ background: b.color, border: `1.5px solid ${b.border}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{b.band}</div>
                <div style={{ fontSize: 11, color: 'var(--secondaryText)', marginBottom: 4 }}>{b.range}</div>
                <div style={{ fontSize: 11, color: '#1c2540' }}>{b.action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
