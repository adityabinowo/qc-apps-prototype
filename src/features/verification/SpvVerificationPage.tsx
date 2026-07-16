import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { useAuth } from '../../context/AuthContext'
import { fetchCompletedInspections, createVerification, updateInspectionLifecycle } from '../../data/queries'
import { compliance, verificationSampleQty } from '../../lib/rules'
import { supabase } from '../../lib/supabase'

const SEVERITIES = ['Minor', 'Major', 'Critical']
const WASTAGE_REASONS = ['Handling — penyimpanan suhu', 'Expired', 'Facility', 'Others']
const DECISION_LAB: Record<string, string> = { Accepted: 'green', 'Conditionally Accepted': 'orange', 'Quarantine All': 'red' }
const BAND_CLS: Record<string, string> = { PASSED: 'g', PASSED_WITH_NOTE: 'y', NOT_PASSED: 'r' }
const BAND_PILL: Record<string, [string, string]> = {
  g: ['var(--tag-green-bg)', 'var(--tag-green-tx)'],
  y: ['var(--tag-yellow-bg)', 'var(--tag-yellow-tx)'],
  r: ['var(--tag-red-bg)', 'var(--tag-red-tx)'],
}

export function SpvVerificationPage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['completed_inspections', auth.hub?.id],
    queryFn: () => fetchCompletedInspections(auth.hub?.id),
  })

  const [selected, setSelected] = useState<any | null>(null)
  const [goodQty, setGoodQty] = useState<number | null>(null)
  const [matchFlag, setMatchFlag] = useState<boolean | null>(null)
  const [severity, setSeverity] = useState('Minor')
  const [defectType, setDefectType] = useState('')
  const [defectQty, setDefectQty] = useState(0)
  const [wastageReason, setWastageReason] = useState(WASTAGE_REASONS[0])

  const sampleQty = selected ? verificationSampleQty(selected.sampling_qty) : 0
  const compResult = selected && goodQty !== null && sampleQty > 0 ? compliance(goodQty, sampleQty) : null

  const reset = () => { setSelected(null); setGoodQty(null); setMatchFlag(null); setSeverity('Minor'); setDefectType(''); setDefectQty(0); setWastageReason(WASTAGE_REASONS[0]) }

  const canSave = goodQty !== null && matchFlag !== null
    && (matchFlag === true || (defectType.trim() !== '' && defectQty > 0 && !!severity && !!wastageReason))

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !canSave || goodQty === null || matchFlag === null || !compResult) return
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

  const bandCls = compResult ? BAND_CLS[compResult.band] ?? 'r' : 'r'
  const officerPill = goodQty === null
    ? { text: '—', bg: 'var(--tag-grey-bg)', fg: 'var(--tag-grey-tx)' }
    : { text: `${compResult!.pct.toFixed(0)}% ${compResult!.band.replace(/_/g, ' ')}`, bg: BAND_PILL[bandCls][0], fg: BAND_PILL[bandCls][1] }
  const stockPill = matchFlag === null
    ? { text: '—', bg: 'var(--tag-grey-bg)', fg: 'var(--tag-grey-tx)' }
    : matchFlag
      ? { text: 'Match · no change', bg: 'var(--tag-green-bg)', fg: 'var(--tag-green-tx)' }
      : { text: 'Mismatch → approval', bg: 'var(--tag-orange-bg)', fg: 'var(--orange)' }

  return (
    <section className="admin active" id="adm-verify">
      <Topbar title="SPV Verification" />
      <div className="page">
        <h1 className="h1">SPV Verification — Re-Inspection</h1>
        <p className="sub">Two separate checks per inspection: <b style={{ color: 'var(--main)' }}>how accurate was the officer</b>, and <b style={{ color: 'var(--orange)' }}>is the stock actually as reported</b>.</p>
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
                  onClick={() => { setSelected(ins); setGoodQty(null); setMatchFlag(null) }}
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

          {/* Verification panel */}
          {selected ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="card card-pad between" style={{ marginBottom: 16 }}>
                <div>
                  <div className="skuname" style={{ fontSize: 17 }}>{selected.stock?.name ?? selected.sku_id}</div>
                  <div className="muted">Officer: {selected.officer_id}</div>
                </div>
                <span className="lab blue">In Progress</span>
              </div>

              {/* Baseline */}
              <div className="callout">
                <div className="muted" style={{ fontWeight: 800, color: 'var(--textV2)', marginBottom: 8 }}>
                  📋 Officer's original result <span style={{ fontWeight: 600, color: 'var(--secondaryText)' }}>— your baseline for both checks</span>
                </div>
                <div className="origrow">
                  <div><div className="k">Qty checked</div><div className="v">{selected.sampling_qty}</div></div>
                  <div><div className="k">Good / Bad</div><div className="v">{selected.qty_good} <span style={{ color: 'var(--secondaryText)', fontWeight: 600 }}>/</span> {selected.qty_bad}</div></div>
                  <div><div className="k">% Non-conformity</div><div className="v">{Number(selected.nc_pct).toFixed(1)}%</div></div>
                  <div><div className="k">Officer's call</div><div className="v"><span className={`lab ${DECISION_LAB[selected.decision] ?? 'grey'}`}>{selected.decision}</span></div></div>
                </div>
              </div>

              {/* Step 1 — Officer accuracy */}
              <div className="evalcard blue">
                <header>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span className="stepno">1</span>
                    <div>
                      <div className="evalhead-t">Officer accuracy</div>
                      <div className="evalhead-s">Re-count the good units in your 20% sample. This scores the <b>officer's reliability</b> — it does <b>not</b> change the stock.</div>
                    </div>
                  </div>
                  <span className="subject-pill subject-officer">Judges: officer</span>
                </header>
                <div className="evalbody">
                  <div className="tiles">
                    <div className="tile"><div className="v">{selected.sampling_qty}</div><div className="l">Officer qty checked</div></div>
                    <div className="tile"><div className="v" style={{ color: 'var(--main)' }}>{sampleQty}</div><div className="l">Your sample (20%)</div></div>
                    <div className="tile"><div className="v">{goodQty === null ? '—' : goodQty}</div><div className="l">Good units you found</div></div>
                  </div>
                  <div className="field" style={{ maxWidth: 320 }}>
                    <label>Good units found in your sample <span className="req">*</span> <span className="muted" style={{ fontWeight: 600 }}>(of {sampleQty})</span></label>
                    <input
                      className="inp fullw" type="number" min={0} max={sampleQty}
                      value={goodQty === null ? '' : goodQty}
                      placeholder="0"
                      onChange={e => setGoodQty(e.target.value === '' ? null : Math.max(0, Math.min(sampleQty, Number(e.target.value))))}
                    />
                  </div>
                  <div className={`outcome ${bandCls}`}>
                    {compResult ? (
                      <>
                        <div className="calc">{`= ${goodQty} ÷ ${sampleQty} × 100  (good units ÷ your sample)`}</div>
                        <div className="big">{compResult.pct.toFixed(1)}% — {compResult.band.replace(/_/g, ' ')}</div>
                        <div className="act">{compResult.action}</div>
                      </>
                    ) : (
                      <div className="calc">Enter the good units to score compliance</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 — Stock condition */}
              <div className="evalcard amber">
                <header>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span className="stepno">2</span>
                    <div>
                      <div className="evalhead-t">Stock condition</div>
                      <div className="evalhead-s">Does your re-check agree with the officer's condition call? This decides the <b>stock</b> — a mismatch creates a status change, it does <b>not</b> re-score the officer.</div>
                    </div>
                  </div>
                  <span className="subject-pill subject-stock">Judges: stock</span>
                </header>
                <div className="evalbody">
                  <div className="muted" style={{ marginBottom: 10 }}>
                    Officer reported <b style={{ color: 'var(--textV2)' }}>{selected.qty_bad} bad unit{selected.qty_bad === 1 ? '' : 's'}</b> ({selected.decision}). After re-checking — do you agree?
                  </div>
                  <div className="toggle">
                    <button type="button" className={`match ${matchFlag === true ? 'on' : ''}`} onClick={() => setMatchFlag(true)}>
                      ✓ Match<small>I agree — officer's result stands</small>
                    </button>
                    <button type="button" className={`mismatch ${matchFlag === false ? 'on' : ''}`} onClick={() => setMatchFlag(false)}>
                      ✕ Mismatch<small>Condition differs — record defects</small>
                    </button>
                  </div>

                  {matchFlag === true && (
                    <div className="note g"><span>✓</span><div>Agreed — the officer's condition holds. <b>No status change</b> is created.</div></div>
                  )}

                  {matchFlag === false && (
                    <div style={{ marginTop: 16 }}>
                      <div className="grid2">
                        <div className="field">
                          <label>Defect type <span className="req">*</span></label>
                          <input className="inp fullw" value={defectType} onChange={e => setDefectType(e.target.value)} placeholder="e.g. Warna berubah, tekstur lembek" />
                        </div>
                        <div className="field">
                          <label>Defect qty <span className="req">*</span></label>
                          <input className="inp fullw" type="number" min={0} value={defectQty} onChange={e => setDefectQty(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="grid2" style={{ marginTop: 14 }}>
                        <div className="field">
                          <label>Severity <span className="req">*</span></label>
                          <select className="inp fullw" value={severity} onChange={e => setSeverity(e.target.value)}>
                            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Wastage reason <span className="req">*</span></label>
                          <select className="inp fullw" value={wastageReason} onChange={e => setWastageReason(e.target.value)}>
                            {WASTAGE_REASONS.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="note o"><span>⚠️</span><div>A status change <b>Available → Bad</b> will be routed to the <b>approval queue</b> (2nd-person check by AM recommended). This is separate from the officer's compliance score above.</div></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save bar */}
              <div className="savebar">
                <div className="savepills">
                  <div className="spill" style={{ background: officerPill.bg, color: officerPill.fg }}><span className="d">Officer</span><span>{officerPill.text}</span></div>
                  <div className="spill" style={{ background: stockPill.bg, color: stockPill.fg }}><span className="d">Stock</span><span>{stockPill.text}</span></div>
                </div>
                <button className="btn btn-primary lg" onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
                  Save Verification
                </button>
              </div>
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
