import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { createInspection, updateInspectionLifecycle } from '../../data/queries'
import { nonConformityPct, decide } from '../../lib/rules'
import { compressToUnder1MB, safePhotoPath } from '../../lib/image'
import { supabase } from '../../lib/supabase'
import type { TaskInterface, StockInterface } from '../../lib/types'

const DEFECT_REASONS = ['Berjamur', 'Lembek (handling)', 'Busuk', 'Expired', 'Kemasan rusak', 'Suhu tidak sesuai', 'Lainnya']

type Step1Data = { productTemp: string; storageCondition: string; earlyStop: boolean; earlyReason: string }

export function InspectionStep2Page() {
  const { state } = useLocation() as { state?: { task: TaskInterface; stock: StockInterface; sampleQty: number; step1: Step1Data } }
  const navigate = useNavigate()
  const { auth } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [qtyGood, setQtyGood] = useState(0)
  const [qtyBad, setQtyBad] = useState(0)
  const [defectReasons, setDefectReasons] = useState<string[]>([])
  const [defectDesc, setDefectDesc] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  if (!state?.task) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No task loaded.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back to Inbox</button>
      </div>
    )
  }

  const { task, stock, sampleQty, step1 } = state
  const earlyStop = step1.earlyStop
  const total = qtyGood + qtyBad
  const qtyOk = earlyStop || total === sampleQty

  const toggleDefect = (r: string) =>
    setDefectReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const submit = useMutation({
    mutationFn: async () => {
      const ncPct = earlyStop ? 100 : nonConformityPct(qtyBad, sampleQty)
      const decision = decide(ncPct)

      setUploading(true)
      const photoUrls: string[] = []
      const uploadTs = Date.now()
      for (const [i, f] of photos.entries()) {
        const compressed = await compressToUnder1MB(f)
        const path = safePhotoPath(auth.hub!.id, f.name, i, uploadTs)
        const { data: up } = await supabase.storage.from('inspection-photos').upload(path, compressed, { upsert: true })
        if (up) {
          const { data: pub } = supabase.storage.from('inspection-photos').getPublicUrl(up.path)
          photoUrls.push(pub.publicUrl)
        }
      }
      setUploading(false)

      const inspection = await createInspection({
        task_id: task.id,
        sku_id: task.sku_id,
        officer_id: auth.user!.id,
        hub_id: auth.hub!.id,
        soh: stock.soh,
        sampling_qty: sampleQty,
        product_temp: parseFloat(step1.productTemp),
        prod_date: null,
        exp_date: null,
        qty_good: earlyStop ? 0 : qtyGood,
        qty_bad: earlyStop ? sampleQty : qtyBad,
        total_defect: earlyStop ? sampleQty : qtyBad,
        defect_reasons: earlyStop ? ['Early stop — critical storage'] : defectReasons,
        defect_desc: earlyStop ? step1.earlyReason : defectDesc,
        nc_pct: ncPct,
        decision: decision.band,
        recommended_action: decision.recommendedAction,
        proposed_status: decision.proposesStatusChange ? 'Bad' : null,
        lifecycle_state: 'SUBMITTED',
      })

      for (const url of photoUrls) {
        await supabase.from('inspection_photos').insert({ inspection_id: inspection.id, url, is_defect: true })
      }

      let nextState: string
      if (decision.band === 'Accepted') nextState = 'COMPLETED'
      else if (decision.band === 'Conditionally Accepted') nextState = 'PENDING_SORT'
      else nextState = 'PENDING_APPROVAL'

      await updateInspectionLifecycle(inspection.id, nextState as any)

      if (decision.proposesStatusChange) {
        await supabase.from('status_changes').insert({
          inspection_id: inspection.id,
          sku_id: task.sku_id,
          hub_id: auth.hub!.id,
          old_status: 'Available',
          new_status: 'Bad',
          state: 'Pending',
          source: 'inspection',
          submitted_at: new Date().toISOString(),
        })
      }

      navigate('/app/officer/result', {
        state: { inspection: { ...inspection, lifecycle_state: nextState }, decision, ncPct, skuName: stock.name },
      })
    },
  })

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 4, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Inspection · Step 2 of 2</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{stock.name}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '12px 14px 0' }}>
        {[1, 2].map(n => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: '#291D80' }} />
        ))}
      </div>
      <div style={{ padding: '16px 14px 80px' }}>
        {earlyStop && (
          <div style={{ background: '#FFF0F3', border: '1px solid #ffc7d2', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#cc1738', fontWeight: 600 }}>
            ⚠️ Early stop — recording as Quarantine All
          </div>
        )}
        {!earlyStop && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔬 Item Inspection</div>
            <div style={{ background: '#E8EFFB', borderRadius: 10, padding: '12px 16px', textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#5a6a84', marginBottom: 2 }}>Sample target</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#291D80' }}>{sampleQty} <span style={{ fontSize: 13, color: '#5a6a84' }}>({total} entered)</span></div>
            </div>
            {total !== sampleQty && total > 0 && (
              <div style={{ background: '#FFF8E6', border: '1px solid #ffe08a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b88a00', marginBottom: 10 }}>
                Good + Bad must equal {sampleQty}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['Good Qty', qtyGood, setQtyGood] as const, ['Bad Qty', qtyBad, setQtyBad] as const].map(([label, val, setter]) => (
                <div key={label}>
                  <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type="number" min={0} value={val} onChange={e => setter(Number(e.target.value))}
                    style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '9px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Defect Reasons</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DEFECT_REASONS.map(r => (
                  <button key={r} onClick={() => toggleDefect(r)} style={{ border: `1px solid ${defectReasons.includes(r) ? '#ff3d5e' : '#d8e2ec'}`, background: defectReasons.includes(r) ? '#FFF0F3' : '#fff', color: defectReasons.includes(r) ? '#cc1738' : '#5a6a84', borderRadius: 99, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea value={defectDesc} onChange={e => setDefectDesc(e.target.value)} rows={2}
                style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '9px 10px', fontSize: 13, boxSizing: 'border-box', resize: 'none' }} />
            </div>
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📷 Photos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((_f, i) => (
              <div key={i} style={{ width: 64, height: 64, borderRadius: 8, background: '#E8EFFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📷</div>
            ))}
            <button onClick={() => fileRef.current?.click()} style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #d8e2ec', background: 'none', fontSize: 22, cursor: 'pointer', color: '#8999b4' }}>＋</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPhotos} />
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={!qtyOk || submit.isPending || uploading}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (!qtyOk || submit.isPending || uploading) ? 0.5 : 1 }}
        >
          {submit.isPending || uploading ? 'Submitting…' : 'Submit Inspection'}
        </button>
      </div>
    </div>
  )
}
