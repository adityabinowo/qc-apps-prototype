import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { useAuth } from '../../context/AuthContext'
import { fetchCompletedInspections, createVerification, updateInspectionLifecycle } from '../../data/queries'
import { compliance, verificationSampleQty } from '../../lib/rules'
import { supabase } from '../../lib/supabase'

const SEVERITIES = ['Minor', 'Major', 'Critical']
const WASTAGE_REASONS = ['Handling — penyimpanan suhu', 'Expired', 'Facility', 'Others']

export function SpvVerificationPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['completed_inspections', auth.hub?.id],
    queryFn: () => fetchCompletedInspections(auth.hub?.id),
  })

  const [selected, setSelected] = useState<any | null>(null)
  const [goodQty, setGoodQty] = useState(0)
  const [matchFlag, setMatchFlag] = useState<boolean | null>(null)
  const [severity, setSeverity] = useState('Minor')
  const [defectType, setDefectType] = useState('')
  const [defectQty, setDefectQty] = useState(0)
  const [wastageReason, setWastageReason] = useState(WASTAGE_REASONS[0])

  const sampleQty = selected ? verificationSampleQty(selected.sampling_qty) : 0
  const compResult = sampleQty > 0 ? compliance(goodQty, sampleQty) : null

  const reset = () => { setSelected(null); setGoodQty(0); setMatchFlag(null); setSeverity('Minor'); setDefectType(''); setDefectQty(0); setWastageReason(WASTAGE_REASONS[0]) }

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || matchFlag === null || !compResult) return
      await createVerification({
        inspection_id: selected.id,
        spv_id: auth.user!.id,
        officer_id: selected.officer_id,
        qty_checked: selected.sampling_qty,
        sample_qty: sampleQty,
        good_qty: goodQty,
        match_flag: matchFlag,
        severity: matchFlag ? null : severity,
        defect_type: matchFlag ? null : defectType,
        defect_qty: matchFlag ? null : defectQty,
        wastage_reason: matchFlag ? null : wastageReason,
        compliance_pct: compResult.pct,
        band: compResult.band,
      })
      await updateInspectionLifecycle(selected.id, 'RE_INSPECTED')
      if (!matchFlag) {
        await supabase.from('status_changes').insert({
          inspection_id: selected.id,
          sku_id: selected.sku_id,
          hub_id: selected.hub_id ?? auth.hub!.id,
          old_status: 'Available',
          new_status: 'Bad',
          state: 'Pending',
          source: 'verification',
          submitted_at: new Date().toISOString(),
        })
      }
      qc.invalidateQueries({ queryKey: ['completed_inspections'] })
      reset()
    },
  })

  return (
    <section className="admin active" id="adm-verify">
      <Topbar title="SPV Verification" />
      <div className="page">
        <h1 className="h1">SPV Verification — Re-Inspection</h1>
        <p className="sub">Re-check completed inspections · sample = 20% of qty checked · compliance tracked per officer</p>
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          {/* Inspection list */}
          <div className="card" style={{ flex: '0 0 300px', padding: 0 }}>
            <div className="pheader">Completed inspections</div>
            <div style={{ padding: '6px 8px' }}>
              {isLoading && <div style={{ padding: 28, textAlign: 'center', color: 'var(--secondaryText)', fontSize: 13 }}>Loading…</div>}
              {!isLoading && (inspections as any[]).length === 0 && (
                <div style={{ padding: 28, textAlign: 'center', color: 'var(--secondaryText)', fontSize: 13 }}>No completed inspections</div>
              )}
              {(inspections as any[]).map((ins: any) => (
                <div
                  key={ins.id}
                  onClick={() => { setSelected(ins); setGoodQty(0); setMatchFlag(null) }}
                  style={{ cursor: 'pointer', border: `1px solid ${selected?.id === ins.id ? 'var(--main)' : 'var(--border)'}`, background: selected?.id === ins.id ? 'var(--mainFaded)' : '#fff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}
                >
                  <div className="skuname">{ins.stock?.name ?? ins.sku_id}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                    {ins.officer_id?.slice(0, 8)} · {ins.sampling_qty} checked · {Number(ins.nc_pct).toFixed(1)}% NC
                  </div>
                  <div style={{ marginTop: 4 }}><span className="lab blue">{ins.lifecycle_state}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification form */}
          {selected ? (
            <div className="card card-pad" style={{ flex: 1 }}>
              <div className="between" style={{ marginBottom: 14 }}>
                <div>
                  <div className="skuname" style={{ fontSize: 17 }}>{selected.stock?.name ?? selected.sku_id}</div>
                  <div className="muted">Officer: {selected.officer_id}</div>
                </div>
                <span className="lab blue">In Progress</span>
              </div>
              <div className="grid3" style={{ marginBottom: 16 }}>
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22 }}>{selected.sampling_qty}</div><div className="l">Qty checked</div></div>
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22, color: 'var(--main)' }}>{sampleQty}</div><div className="l">SPV sample (20%)</div></div>
                <div className="kpi" style={{ padding: 14 }}><div className="v" style={{ fontSize: 22 }}>{goodQty}</div><div className="l">Good qty (SPV)</div></div>
              </div>
              <div className="formsec">
                <header>Re-inspection result</header>
                <div>
                  <div className="grid2">
                    <div className="field">
                      <label>Good qty found <span className="req">*</span></label>
                      <input className="inp fullw" type="number" min={0} max={sampleQty} value={goodQty} onChange={e => setGoodQty(Number(e.target.value))} />
                    </div>
                    <div className="field">
                      <label>Result <span className="req">*</span></label>
                      <div className="row" style={{ gap: 6 }}>
                        <span
                          className={`chip ${matchFlag === false ? 'active' : ''}`}
                          style={{ cursor: 'pointer', background: matchFlag === false ? 'var(--orange)' : undefined, borderColor: matchFlag === false ? 'var(--orange)' : undefined, color: matchFlag === false ? '#fff' : undefined }}
                          onClick={() => setMatchFlag(false)}
                        >
                          Mismatch
                        </span>
                        <span className={`chip ${matchFlag === true ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setMatchFlag(true)}>
                          Match
                        </span>
                      </div>
                    </div>
                  </div>
                  {matchFlag === false && (
                    <>
                      <div className="grid2">
                        <div className="field">
                          <label>Severity <span className="req">*</span></label>
                          <select className="inp fullw" value={severity} onChange={e => setSeverity(e.target.value)}>
                            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Defect qty <span className="req">*</span></label>
                          <input className="inp fullw" type="number" min={0} value={defectQty} onChange={e => setDefectQty(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Defect type <span className="req">*</span></label>
                        <input className="inp fullw" value={defectType} onChange={e => setDefectType(e.target.value)} placeholder="e.g. Packaging broken" />
                      </div>
                      <div className="field">
                        <label>Wastage reason</label>
                        <select className="inp fullw" value={wastageReason} onChange={e => setWastageReason(e.target.value)}>
                          {WASTAGE_REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="alert warn mb0"><span className="ic">⚠️</span><div>Mismatch — status change will be routed to the approval queue.</div></div>
                    </>
                  )}
                </div>
              </div>
              {compResult && (
                <div style={{ background: compResult.band === 'PASSED' ? 'var(--tag-green-bg)' : compResult.band === 'PASSED_WITH_NOTE' ? 'var(--tag-orange-bg)' : 'var(--tag-red-bg)', borderRadius: 10, padding: '16px 20px', marginTop: 14 }}>
                  <div className="between">
                    <div>
                      <div className="smcap">{`= ${goodQty} ÷ ${sampleQty} × 100`}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{compResult.pct.toFixed(1)}% — {compResult.band.replace(/_/g, ' ')}</div>
                      <div className="note" style={{ marginTop: 3 }}>{compResult.action}</div>
                    </div>
                    <button
                      className="btn btn-primary lg"
                      onClick={() => save.mutate()}
                      disabled={matchFlag === null || save.isPending}
                    >
                      Save Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card card-pad" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondaryText)', minHeight: 200 }}>
              Select a completed inspection from the list
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
