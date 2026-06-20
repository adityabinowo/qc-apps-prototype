import { useLocation, useNavigate } from 'react-router-dom'
import { buildQualityReceipt } from '../../lib/pdf'

export function ReceiptPage() {
  const { state } = useLocation() as { state?: { inspection: any; decision: any; ncPct: number; skuName: string } }
  const navigate = useNavigate()

  if (!state) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No receipt data.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back</button>
      </div>
    )
  }

  const { inspection, decision, ncPct, skuName } = state

  const handleDownload = () => {
    const blob = buildQualityReceipt({ ...inspection, skuName })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `receipt-${inspection.id?.slice(0, 8) ?? 'qc'}.pdf`
    a.click(); URL.revokeObjectURL(url)
  }

  const rows = [
    ['SKU', skuName],
    ['Decision', decision.band],
    ['% Non-Conformity', `${ncPct?.toFixed(1) ?? 0}%`],
    ['State', inspection.lifecycle_state],
    ['Date', new Date(inspection.created_at).toLocaleString('id-ID')],
    ['SOH', String(inspection.soh)],
    ['Sampling qty', String(inspection.sampling_qty)],
    ['Good / Bad', `${inspection.qty_good} / ${inspection.qty_bad}`],
  ]

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Receipt</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Quality Receipt</div>
      </div>
      <div style={{ padding: '16px 14px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8edf5', marginBottom: 14 }}>
          <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>QUALITY RECEIPT</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Astro Quality Control</div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
                <span style={{ color: '#8999b4', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#1c2540', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleDownload}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          ⬇ Download PDF
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
