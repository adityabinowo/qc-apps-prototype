import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { fetchPendingApprovals, approveStatusChange, rejectStatusChange } from '../../data/queries'

function ageMinutes(submitted: string) {
  return Math.round((Date.now() - new Date(submitted).getTime()) / 60000)
}
function ageLabel(submitted: string) {
  const m = ageMinutes(submitted)
  return m > 60 ? `${Math.round(m / 60)}h` : `${m} min`
}

export function ApprovalQueuePage() {
  const { auth } = useAuth()
  const qc = useQueryClient()
  const { data: pending = [], isLoading } = useQuery({ queryKey: ['approvals'], queryFn: fetchPendingApprovals, staleTime: 0, refetchInterval: 30000 })
  const [selected, setSelected] = useState<any | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const overSla = (pending as any[]).filter(p => ageMinutes(p.submitted_at) > 15)

  const approve = useMutation({
    mutationFn: () => approveStatusChange(selected!.id, selected!.sku_id, selected!.new_status, auth.user!.id, selected!.inspection_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); setSelected(null) },
  })

  const reject = useMutation({
    mutationFn: () => rejectStatusChange(selected!.id, rejectReason, auth.user!.id, selected!.inspection_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); setSelected(null); setRejectOpen(false); setRejectReason('') },
  })

  const verification = selected?.inspections?.verifications?.[0]
  const changedQty = selected?.source === 'verification'
    ? verification?.defect_qty
    : selected?.inspections?.total_defect ?? selected?.inspections?.qty_bad

  return (
    <section className="admin active" id="adm-approval">
      <Topbar title="Approval Queue" />
      <div className="page">
        <h1 className="h1">Status Change Approval Queue</h1>
        <p className="sub">Gate before WIMS write · SLA reminder at 5 min · escalation at 15 min</p>
        {overSla.length > 0 && (
          <div className="alert warn">
            <span className="ic">⏱️</span>
            <div><b>{overSla.length} approval{overSla.length > 1 ? 's are' : ' is'} over SLA</b> (&gt;15 min without decision).</div>
          </div>
        )}
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          {/* Queue list */}
          <div className="card" style={{ flex: '0 0 320px', padding: 0 }}>
            <div className="pheader">Pending · {isLoading ? '…' : (pending as any[]).length}</div>
            <div style={{ padding: '8px 10px' }}>
              {!isLoading && (pending as any[]).length === 0 && (
                <div style={{ textAlign: 'center', padding: 28, color: 'var(--secondaryText)', fontSize: 13 }}>No pending approvals</div>
              )}
              {(pending as any[]).map((p: any) => {
                const age = ageMinutes(p.submitted_at)
                const isSelected = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{ cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--main)' : 'var(--border)'}`, background: isSelected ? 'var(--mainFaded)' : '#fff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}
                  >
                    <div className="between">
                      <div className="skuname">{p.stock?.name ?? p.sku_id}</div>
                      <span className={`lab ${age > 15 ? 'red' : age > 5 ? 'yellow' : 'grey'}`}>{ageLabel(p.submitted_at)}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 3, fontSize: 11 }}>{p.sku_id} · {p.hub_id}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className="lab green">{p.old_status}</span>
                      <span style={{ color: 'var(--secondaryText)', fontSize: 11 }}>→</span>
                      <span className="lab red">{p.new_status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="card card-pad" style={{ flex: 1 }}>
              <div className="between" style={{ marginBottom: 14 }}>
                <div>
                  <div className="skuname" style={{ fontSize: 17 }}>{selected.stock?.name ?? selected.sku_id}</div>
                  <div className="muted">{selected.sku_id} · {selected.hub_id}</div>
                </div>
                <span className={`lab ${ageMinutes(selected.submitted_at) > 15 ? 'red' : ageMinutes(selected.submitted_at) > 5 ? 'yellow' : 'grey'}`}>
                  {ageLabel(selected.submitted_at)} ago
                </span>
              </div>

              <div className="compare">
                <div>
                  <h5>Current — WIMS</h5>
                  <span className="lab green">{selected.old_status}</span>
                </div>
                <div>
                  <h5>Reported — QA Officer</h5>
                  <span className="lab red">{selected.new_status}</span>
                  {selected.inspections && (
                    <div style={{ marginTop: 10 }}>
                      <div className="kv"><div className="k">% Non-Conformity</div><div className="val" style={{ color: 'var(--red)' }}>{selected.inspections.nc_pct?.toFixed(1)}%</div></div>
                      {selected.inspections.defect_reasons?.length > 0 && (
                        <div className="kv"><div className="k">Defect reasons</div><div className="val">{selected.inspections.defect_reasons.join(', ')}</div></div>
                      )}
                      {selected.inspections.defect_desc && (
                        <div className="kv"><div className="k">Note</div><div className="val">{selected.inspections.defect_desc}</div></div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="smcap" style={{ marginBottom: 8 }}>Impact</div>
                {changedQty != null && (
                  <div className="kv"><div className="k">Available → Bad qty</div><div className="val">{changedQty}</div></div>
                )}
                {verification ? (
                  <>
                    <div className="kv"><div className="k">Officer accuracy (SPV)</div><div className="val">{verification.compliance_pct}% — {verification.band.replace(/_/g, ' ')}</div></div>
                    <div className="kv"><div className="k">Stock condition (SPV)</div><div className="val"><span className={`lab ${verification.match_flag ? 'green' : 'orange'}`}>{verification.match_flag ? 'Match' : 'Mismatch'}</span></div></div>
                  </>
                ) : (
                  <div className="kv"><div className="k">SPV verification</div><div className="val" style={{ color: 'var(--secondaryText)', fontWeight: 600 }}>Not yet verified</div></div>
                )}
              </div>

              {selected.inspections?.inspection_photos?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="smcap" style={{ marginBottom: 8 }}>Photos ({selected.inspections.inspection_photos.length})</div>
                  <div className="photos">
                    {selected.inspections.inspection_photos.map((ph: any, i: number) => (
                      <a key={i} href={ph.url} target="_blank" rel="noreferrer">
                        <img src={ph.url} alt="defect" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="divider" />
              <div className="between">
                <div className="note" style={{ maxWidth: 320 }}>Approving writes the new status to WIMS and logs to audit trail.</div>
                <div className="row">
                  <button className="btn btn-danger" onClick={() => setRejectOpen(true)}>Reject</button>
                  <button className="btn btn-success" onClick={() => approve.mutate()} disabled={approve.isPending}>Approve &amp; Write to WIMS</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card card-pad" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondaryText)', minHeight: 200 }}>
              Select an item from the queue
            </div>
          )}
        </div>
      </div>

      <Modal
        open={rejectOpen}
        title="Reject Status Change"
        onClose={() => { setRejectOpen(false); setRejectReason('') }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setRejectOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => reject.mutate()} disabled={!rejectReason || reject.isPending}>Reject</button>
          </>
        }
      >
        <div className="field">
          <label>Rejection reason <span className="req">*</span></label>
          <textarea className="inp fullw" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why the proposed change is rejected…" />
        </div>
      </Modal>
    </section>
  )
}
