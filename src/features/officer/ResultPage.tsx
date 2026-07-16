import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { updateStatusChangeQty } from '../../data/queries'
import type { DecisionResultInterface } from '../../lib/rules'

export function ResultPage() {
  const { state } = useLocation() as { state?: { inspection: any; decision: DecisionResultInterface; ncPct: number; skuName: string; photoUploadFailures?: number } }
  const navigate = useNavigate()
  const [sortedBadQty, setSortedBadQty] = useState<number | null>(null)
  const saveSortedQty = useMutation({
    mutationFn: () => updateStatusChangeQty(state!.inspection.id, sortedBadQty!),
  })

  if (!state) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No result data.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back to Inbox</button>
      </div>
    )
  }

  const { decision, ncPct, skuName, inspection, photoUploadFailures } = state
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
        {!!photoUploadFailures && (
          <div style={{ background: '#FFF0F3', border: '1px solid #ffc7d2', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#cc1738', fontWeight: 600 }}>
            ⚠️ {photoUploadFailures} photo{photoUploadFailures > 1 ? 's' : ''} failed to upload. The inspection was saved, but this evidence is missing — notify your supervisor.
          </div>
        )}
        {isCond && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚖️ Sorted bad qty (1:1)</div>
            {saveSortedQty.isSuccess ? (
              <div style={{ fontSize: 13, color: '#1a7a4a', fontWeight: 600 }}>✓ Saved — {sortedBadQty} pcs recorded as Available → Bad.</div>
            ) : (
              <>
                <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  After sorting good/bad 1:1, how many units are actually bad?
                </label>
                <input
                  type="number" min={0}
                  value={sortedBadQty ?? ''}
                  onChange={e => setSortedBadQty(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="0"
                  style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '9px 10px', fontSize: 14, boxSizing: 'border-box', marginBottom: 10 }}
                />
                <button
                  onClick={() => saveSortedQty.mutate()}
                  disabled={sortedBadQty === null || sortedBadQty < 0 || saveSortedQty.isPending}
                  style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (sortedBadQty === null || saveSortedQty.isPending) ? 0.5 : 1 }}
                >
                  {saveSortedQty.isPending ? 'Saving…' : 'Save sorted qty'}
                </button>
              </>
            )}
          </div>
        )}
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
