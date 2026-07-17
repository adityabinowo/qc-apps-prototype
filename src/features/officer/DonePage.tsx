import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchTaskDetail } from '../../data/queries'
import { decide } from '../../lib/rules'

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 10, border: '1px solid #e8edf5' }
const kv: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div style={kv}>
      <span style={{ color: '#8999b4' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1c2540' }}>{value}</span>
    </div>
  )
}

export function DonePage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading } = useQuery({ queryKey: ['task_detail', taskId], queryFn: () => fetchTaskDetail(taskId!), enabled: !!taskId }) as { data: any; isLoading: boolean }

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center', color: '#8999b4', fontFamily: 'Montserrat,sans-serif' }}>Loading…</div>
  }

  const inspection = task?.inspections?.[0]

  if (!task || !inspection) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No completed inspection found for this task.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back to Inbox</button>
      </div>
    )
  }

  const skuName = task.master_leveling?.name ?? task.sku_id
  const decision = decide(inspection.nc_pct)

  const handlePrint = () => {
    navigate('/app/officer/receipt', {
      state: { inspection, decision, ncPct: inspection.nc_pct, skuName },
    })
  }

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 4, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Done</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{skuName}</div>
      </div>
      <div style={{ background: '#EAEEF7', color: '#5a6a84', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: 8 }}>
        🔒 Task completed — view only, no changes can be made
      </div>

      <div style={{ padding: '16px 14px 80px' }}>
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📦 Stock &amp; sampling</div>
          <Kv label="Stock on hand · SLOC" value={`${inspection.soh ?? task.soh ?? '—'} · ${task.sloc ?? '—'}`} />
          <Kv label="Sampling qty" value={String(inspection.sampling_qty)} />
          <Kv label="Product temperature" value={inspection.product_temp != null ? `${inspection.product_temp} °C` : '—'} />
        </div>

        {inspection.early_stop ? (
          <div style={{ ...card, background: '#FFF0F3', border: '1px solid #ffc7d2' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#cc1738' }}>⚠️ Early stop — Quarantine All</div>
            <div style={{ fontSize: 12, color: '#cc1738' }}>{inspection.storage_condition} — {inspection.early_reason}</div>
          </div>
        ) : (
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🧊 Step 1 — checklist</div>
            <Kv label="Storage condition" value={inspection.storage_condition ?? '—'} />
            <Kv label="Color / Texture" value={`${inspection.color || '—'} / ${inspection.texture ?? '—'}`} />
            <Kv label="Packaging / Seal" value={`${inspection.packaging || '—'} / ${inspection.seal ?? '—'}`} />
            <Kv label="Cleanliness" value={inspection.cleanliness ?? '—'} />
          </div>
        )}

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🔬 Step 2 — result</div>
          <Kv label="Good / Bad" value={`${inspection.qty_good} / ${inspection.qty_bad}`} />
          <Kv label="% Non-conformity" value={inspection.nc_pct === 100 && inspection.early_stop ? '—' : `${Number(inspection.nc_pct).toFixed(1)}%`} />
          <Kv label="Decision" value={inspection.decision} />
          {inspection.defect_reasons?.length > 0 && <Kv label="Defect reasons" value={inspection.defect_reasons.join(', ')} />}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📷 Photos ({inspection.inspection_photos?.length ?? 0})</div>
          {inspection.inspection_photos?.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {inspection.inspection_photos.map((ph: any, i: number) => (
                <a key={i} href={ph.url} target="_blank" rel="noreferrer">
                  <img src={ph.url} alt="evidence" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8edf5' }} />
                </a>
              ))}
            </div>
          ) : (
            <div style={{ color: '#8999b4', fontSize: 13 }}>No photos attached.</div>
          )}
        </div>

        <button
          onClick={handlePrint}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          🧾 Print Quality Receipt
        </button>
        <button
          onClick={() => navigate('/app/officer/inbox')}
          style={{ width: '100%', background: '#fff', color: '#291D80', border: '1px solid #291D80', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back to Inbox
        </button>
      </div>
    </div>
  )
}
