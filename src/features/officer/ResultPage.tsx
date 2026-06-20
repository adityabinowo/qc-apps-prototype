import { useLocation, useNavigate } from 'react-router-dom'
import type { DecisionResultInterface } from '../../lib/rules'

export function ResultPage() {
  const { state } = useLocation() as { state?: { inspection: any; decision: DecisionResultInterface; ncPct: number; skuName: string } }
  const navigate = useNavigate()

  if (!state) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No result data.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back to Inbox</button>
      </div>
    )
  }

  const { decision, ncPct, skuName, inspection } = state
  const isGood = decision.band === 'Accepted'
  const isCond = decision.band === 'Conditionally Accepted'
  const bg = isGood ? '#E6F9EF' : isCond ? '#FFF8E6' : '#FFF0F3'
  const color = isGood ? '#1a7a4a' : isCond ? '#b88a00' : '#cc1738'
  const label = isGood ? 'Accepted' : isCond ? 'Cond. Accepted' : 'Quarantine All'

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Result</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{skuName}</div>
      </div>
      <div style={{ padding: '16px 14px 80px' }}>
        <div style={{ background: bg, borderRadius: 14, padding: '24px', textAlign: 'center', marginBottom: 14, border: `1px solid ${color}33` }}>
          <div style={{ fontSize: 44, fontWeight: 900, color }}>{ncPct === 100 ? '—' : `${ncPct.toFixed(1)}%`}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{label}</div>
          <div style={{ fontSize: 13, color, opacity: 0.8, marginTop: 8 }}>{decision.recommendedAction}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📊 Summary</div>
          {[
            ['Lifecycle State', inspection.lifecycle_state],
            ['Decision', inspection.decision],
            ['WMS change proposed', inspection.proposed_status ? `Available → ${inspection.proposed_status}` : 'None'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
              <span style={{ color: '#8999b4' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#1c2540' }}>{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/app/officer/receipt', { state })}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          View &amp; Download Receipt
        </button>
        <button
          onClick={() => navigate('/app/officer/inbox')}
          style={{ width: '100%', background: '#fff', color: '#291D80', border: '1px solid #291D80', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Back to Inbox
        </button>
      </div>
    </div>
  )
}
