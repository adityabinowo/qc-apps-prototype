import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchTaskDetail, fetchUsers } from '../../data/queries'

const STATUS_LAB: Record<string, string> = { Pending: 'grey', 'In Progress': 'blue', Done: 'green', Overdue: 'red' }
const DECISION_LAB: Record<string, string> = { Accepted: 'green', 'Conditionally Accepted': 'orange', 'Quarantine All': 'red' }
const BAND_LAB: Record<string, string> = { PASSED: 'green', PASSED_WITH_NOTE: 'yellow', NOT_PASSED: 'red' }
const STATE_LAB: Record<string, string> = { Pending: 'yellow', Approved: 'green', Rejected: 'red' }

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading } = useQuery({ queryKey: ['task_detail', id], queryFn: () => fetchTaskDetail(id!), enabled: !!id }) as { data: any; isLoading: boolean }
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const userName = (userId: string | null | undefined) => users.find(u => u.id === userId)?.name ?? userId ?? '—'

  if (isLoading) {
    return (
      <section className="admin active">
        <Topbar title="Task detail" />
        <div className="page"><div style={{ textAlign: 'center', padding: 60, color: 'var(--secondaryText)' }}>Loading…</div></div>
      </section>
    )
  }

  if (!task) {
    return (
      <section className="admin active">
        <Topbar title="Task detail" />
        <div className="page">
          <button className="btn btn-naked" onClick={() => navigate('/app/tasks')} style={{ marginBottom: 12 }}>← Back to Task Management</button>
          <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--secondaryText)' }}>Task not found.</div>
        </div>
      </section>
    )
  }

  const inspection = task.inspections?.[0]
  const verification = inspection?.verifications?.[0]
  const statusChange = inspection?.status_changes?.[0]

  return (
    <section className="admin active">
      <Topbar title="Task detail" />
      <div className="page">
        <button className="btn btn-naked" onClick={() => navigate('/app/tasks')} style={{ marginBottom: 12 }}>← Back to Task Management</button>

        <div className="card card-pad between" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
          <div>
            <div className="skuname" style={{ fontSize: 18 }}>{task.master_leveling?.name ?? task.sku_id}</div>
            <div className="muted" style={{ marginTop: 2 }}>
              Task {task.id.slice(0, 8).toUpperCase()} · SKU {task.sku_id} · Officer: {task.officer_id ?? 'Unassigned'} · Deadline: {formatDateTime(task.deadline)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`lab ${STATUS_LAB[task.status] ?? 'grey'}`}>{task.status}</span>
            <div className="muted" style={{ marginTop: 6 }}>{task.priority} · {task.level} · {task.coverage_pct}%</div>
          </div>
        </div>

        {/* Inspection detail */}
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Inspection detail — from QA Officer</h3>
          {!inspection ? (
            <div className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>Not yet inspected.</div>
          ) : (
            <>
              <div className="kv" style={{ marginBottom: 16 }}>
                <div><div className="k">Stock on hand (WMS)</div><div className="val">{task.soh ?? inspection.soh} pcs{task.sloc ? ` · SLOC ${task.sloc}` : ''}</div></div>
                <div><div className="k">Sampling qty</div><div className="val">{inspection.sampling_qty} pcs</div></div>
                <div><div className="k">Product temperature</div><div className="val">{inspection.product_temp != null ? `${inspection.product_temp} °C` : '—'}</div></div>
                <div><div className="k">Expiry date</div><div className="val">{formatDate(task.expiry_date ?? inspection.exp_date)}</div></div>
              </div>

              {inspection.early_stop ? (
                <div className="alert warn" style={{ marginBottom: 16 }}>
                  <span className="ic">⚠️</span>
                  <div><b>Early stop — Quarantine All</b> ({inspection.storage_condition}). Reason: {inspection.early_reason}</div>
                </div>
              ) : (
                <>
                  <div className="muted" style={{ fontWeight: 800, color: 'var(--textV2)', margin: '6px 0 10px' }}>Step 1 — Storage &amp; physical checklist</div>
                  <div className="checkgrid" style={{ marginBottom: 16 }}>
                    <div className="chk"><div className="k">Storage condition</div><div className="v">{inspection.storage_condition ?? '—'}</div></div>
                    <div className="chk"><div className="k">Color</div><div className="v">{inspection.color || '—'}</div></div>
                    <div className="chk"><div className="k">Texture</div><div className="v">{inspection.texture ?? '—'}</div></div>
                    <div className="chk"><div className="k">Packaging</div><div className="v">{inspection.packaging || '—'}</div></div>
                    <div className="chk"><div className="k">Seal</div><div className="v">{inspection.seal ?? '—'}</div></div>
                    <div className="chk"><div className="k">Cleanliness</div><div className="v">{inspection.cleanliness ?? '—'}</div></div>
                  </div>
                </>
              )}

              <div className="muted" style={{ fontWeight: 800, color: 'var(--textV2)', margin: '6px 0 10px' }}>Step 2 — Inspect item</div>
              <div className="kv" style={{ marginBottom: 16 }}>
                <div><div className="k">Good qty</div><div className="val" style={{ color: 'var(--tag-green-tx)' }}>{inspection.qty_good}</div></div>
                <div><div className="k">Bad qty</div><div className="val" style={{ color: 'var(--red)' }}>{inspection.qty_bad}</div></div>
                <div><div className="k">Total defect</div><div className="val">{inspection.total_defect} pcs</div></div>
                <div><div className="k">% Non-conformity</div><div className="val">{Number(inspection.nc_pct).toFixed(1)}%</div></div>
                <div><div className="k">Decision</div><div className="val"><span className={`lab ${DECISION_LAB[inspection.decision] ?? 'grey'}`}>{inspection.decision}</span></div></div>
                <div><div className="k">Recommended action</div><div className="val" style={{ fontSize: 13 }}>{inspection.recommended_action}</div></div>
              </div>

              {inspection.defect_reasons?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smcap" style={{ marginBottom: 6 }}>Defect reasons</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {inspection.defect_reasons.map((r: string, i: number) => <span key={i} className="pchip">{r}</span>)}
                  </div>
                </div>
              )}

              {inspection.defect_desc && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smcap" style={{ marginBottom: 6 }}>Officer notes</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>"{inspection.defect_desc}"</p>
                </div>
              )}

              <div>
                <div className="smcap" style={{ marginBottom: 6 }}>Photo evidence ({inspection.inspection_photos?.length ?? 0})</div>
                {inspection.inspection_photos?.length > 0 ? (
                  <div className="photos">
                    {inspection.inspection_photos.map((ph: any, i: number) => (
                      <a key={i} href={ph.url} target="_blank" rel="noreferrer">
                        <img src={ph.url} alt="evidence" style={{ width: 66, height: 66, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No photos attached.</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* SPV Verification */}
        {inspection && (
          <>
            <div className="evalcard blue">
              <header>
                <div className="evalhead-t">SPV Verification result</div>
                <span className="subject-pill subject-officer">Officer accuracy</span>
              </header>
              <div className="evalbody">
                {!verification ? (
                  <div className="muted">Not yet verified.</div>
                ) : (
                  <div className="kv">
                    <div><div className="k">SPV sample (20%)</div><div className="val">{verification.sample_qty} pcs</div></div>
                    <div><div className="k">Good found (SPV)</div><div className="val">{verification.good_qty}</div></div>
                    <div><div className="k">Compliance</div><div className="val"><span className={`lab ${BAND_LAB[verification.band] ?? 'grey'}`}>{verification.band.replace(/_/g, ' ')} · {verification.compliance_pct}%</span></div></div>
                    <div><div className="k">Verified by</div><div className="val" style={{ fontSize: 13 }}>{userName(verification.spv_id)} · {formatDateTime(verification.created_at)}</div></div>
                  </div>
                )}
              </div>
            </div>

            <div className="evalcard amber">
              <header>
                <div className="evalhead-t">Stock condition</div>
                <span className="subject-pill subject-stock">Stock</span>
              </header>
              <div className="evalbody">
                {!verification ? (
                  <div className="muted">Not yet verified.</div>
                ) : verification.match_flag ? (
                  <div><span className="lab green">Match</span> <span className="muted">— SPV agrees with officer's condition call. No extra defects recorded.</span></div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 8 }}><span className="lab orange">Mismatch</span> <span className="muted">— SPV disagrees with officer's condition call.</span></div>
                    <div className="kv">
                      <div><div className="k">Severity</div><div className="val">{verification.severity ?? '—'}</div></div>
                      <div><div className="k">Defect type</div><div className="val">{verification.defect_type ?? '—'}</div></div>
                      <div><div className="k">Defect qty</div><div className="val">{verification.defect_qty ?? '—'}</div></div>
                      <div><div className="k">Wastage reason</div><div className="val">{verification.wastage_reason ?? '—'}</div></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Status change */}
        {inspection && (
          <div className="card card-pad">
            <h3 className="section-title">Stock status change → WMS</h3>
            {!statusChange ? (
              <div className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>No status change.</div>
            ) : (
              <div className="kv">
                <div><div className="k">Change</div><div className="val"><span className="lab green">{statusChange.old_status}</span> → <span className="lab red">{statusChange.new_status}</span></div></div>
                <div><div className="k">Sorted bad qty</div><div className="val" style={{ color: 'var(--red)' }}>{statusChange.qty_changed != null ? `${statusChange.qty_changed} pcs` : 'Not yet sorted'}</div></div>
                <div><div className="k">State</div><div className="val"><span className={`lab ${STATE_LAB[statusChange.state] ?? 'grey'}`}>{statusChange.state === 'Approved' ? 'Approved → written to WMS' : statusChange.state}</span></div></div>
                <div><div className="k">{statusChange.state === 'Rejected' ? 'Rejected by' : 'Approved by'}</div><div className="val" style={{ fontSize: 13 }}>{statusChange.decided_by ? `${userName(statusChange.decided_by)} · ${formatDateTime(statusChange.decided_at)}` : '—'}</div></div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
