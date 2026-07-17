import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWmsInventoryBySku, updateTaskStatus } from '../../data/queries'
import { samplingQty } from '../../lib/rules'
import type { TaskInterface } from '../../lib/types'

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function StockPage() {
  const { state } = useLocation() as { state?: { task: TaskInterface & { master_leveling?: { name: string; category: string } } } }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const task = state?.task

  // Read from wms_inventory (most recent upload) — bypasses the legacy stock table
  const { data: wmsRow } = useQuery({
    queryKey: ['wms_sku', task?.sku_id, task?.hub_id],
    queryFn: () => fetchWmsInventoryBySku(task!.sku_id, task!.hub_id),
    enabled: !!task,
  })

  if (!task) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No task selected.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer' }}>Back to Inbox</button>
      </div>
    )
  }

  // Task fields first (set by generateTasks after DB migration), wms_inventory as fallback
  const soh = task.soh ?? wmsRow?.soh_available ?? 0
  const sloc = task.sloc ?? wmsRow?.sloc ?? ''
  const expiry = task.expiry_date ?? wmsRow?.expiry_date ?? null
  const category = task.master_leveling?.category ?? '—'
  const sampleQty = samplingQty(task.coverage_pct, soh)

  const daysToExpiry = expiry ? Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000) : null
  const nearExpiry = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 7
  const hasInfo = soh > 0 || !!wmsRow
  const showInstructions = !!task.instructions && !task.instructions.startsWith('sloc:')

  const InfoRow = ({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
      <span style={{ color: '#8999b4' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1c2540', display: 'flex', alignItems: 'center', gap: 6 }}>{value}{extra}</span>
    </div>
  )

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 4, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Open Task</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{task.master_leveling?.name ?? task.sku_id}</div>
      </div>

      <div style={{ padding: '16px 14px 80px' }}>
        <div style={{ background: '#291D80', borderRadius: 14, padding: '20px 24px', marginBottom: 14, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Sampling target</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{sampleQty} <span style={{ fontSize: 16, opacity: 0.8 }}>pcs</span></div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>of {soh || '—'} SOH · {task.level} · {task.coverage_pct}% coverage</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 10, border: '1px solid #e8edf5' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📦 Stock Info</div>
          {hasInfo ? (
            <>
              <InfoRow label="SKU ID" value={task.sku_id} />
              <InfoRow label="Category" value={category} />
              <InfoRow label="SLOC" value={sloc || '—'} />
              <InfoRow
                label="Expiry date"
                value={formatDate(expiry)}
                extra={nearExpiry ? <span style={{ background: '#FFF3CD', color: '#856404', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>SOON</span> : undefined}
              />
              <InfoRow label="Stock on Hand" value={String(soh)} />
              <InfoRow label="Level" value={`${task.level} · ${task.coverage_pct}%`} />
            </>
          ) : (
            <div style={{ color: '#8999b4', fontSize: 13 }}>Stock info not available for this SKU at this hub.</div>
          )}
        </div>

        {showInstructions && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 10, border: '1px solid #e8edf5' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 Instructions</div>
            <p style={{ fontSize: 12, color: '#5a6a84', margin: 0 }}>{task.instructions}</p>
          </div>
        )}

        {soh <= 0 && (
          <div style={{ background: '#FFF3CD', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#856404' }}>
            No available stock for this SKU at this hub.
          </div>
        )}

        <button
          onClick={() => {
            if (task.status === 'Pending') {
              updateTaskStatus(task.id, 'In Progress').then(() => qc.invalidateQueries({ queryKey: ['tasks'] }))
            }
            navigate('/app/officer/step1', { state: { task, stock: { sku_id: task.sku_id, soh, sloc, expiry_date: expiry, category }, sampleQty } })
          }}
          disabled={soh <= 0}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, cursor: soh > 0 ? 'pointer' : 'not-allowed', marginTop: 8, opacity: soh <= 0 ? 0.6 : 1 }}
        >
          Start Inspection →
        </button>
      </div>
    </div>
  )
}
