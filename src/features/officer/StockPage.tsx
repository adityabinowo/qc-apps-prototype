import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStock } from '../../data/queries'
import { samplingQty } from '../../lib/rules'
import type { TaskInterface } from '../../lib/types'

export function StockPage() {
  const { state } = useLocation() as { state?: { task: TaskInterface & { stock?: { name: string; category: string } } } }
  const navigate = useNavigate()
  const { data: stocks = [] } = useQuery({ queryKey: ['stock'], queryFn: () => fetchStock() })

  if (!state?.task) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No task selected.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer' }}>Back to Inbox</button>
      </div>
    )
  }

  const task = state.task
  const stock = stocks.find(s => s.sku_id === task.sku_id)
  const sampleQty = stock ? samplingQty(task.coverage_pct, stock.soh) : 0

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 4, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Open Task</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{task.stock?.name ?? task.sku_id}</div>
      </div>
      <div style={{ padding: '16px 14px 80px' }}>
        <div style={{ background: '#291D80', borderRadius: 14, padding: '20px 24px', marginBottom: 14, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Sampling target</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{sampleQty} <span style={{ fontSize: 16, opacity: 0.8 }}>pcs</span></div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>of {stock?.soh ?? '—'} SOH · {task.level} · {task.coverage_pct}% coverage</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 10, border: '1px solid #e8edf5' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📦 Stock Info</div>
          {stock ? (
            <>
              {[
                ['SKU ID', stock.sku_id],
                ['Category', stock.category],
                ['SLOC', stock.sloc],
                ['Stock on Hand', String(stock.soh)],
                ['Status', stock.stock_status],
                ['Level', `${task.level} · ${task.coverage_pct}%`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
                  <span style={{ color: '#8999b4' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: '#1c2540' }}>{v}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: '#8999b4', fontSize: 13 }}>Stock info not available</div>
          )}
        </div>
        {task.instructions && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 10, border: '1px solid #e8edf5' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 Instructions</div>
            <p style={{ fontSize: 12, color: '#5a6a84', margin: 0 }}>{task.instructions}</p>
          </div>
        )}
        <button
          onClick={() => navigate('/app/officer/step1', { state: { task, stock, sampleQty } })}
          disabled={!stock}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
        >
          Start Inspection →
        </button>
      </div>
    </div>
  )
}
