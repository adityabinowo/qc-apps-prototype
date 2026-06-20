import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../../components/Topbar'
import { fetchMasterLeveling, fetchPriorityList, insertPriorityList } from '../../data/queries'
import { riskPriority } from '../../lib/rules'
import type { PriorityListInterface } from '../../lib/types'

const PARAMS = [
  'Komplain pelanggan', 'Temuan audit internal', 'Riwayat NC tinggi',
  'Kategori sensitif', 'Musim/cuaca', 'Vendor baru',
]

function currentWeek(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export function PriorityGeneratorPage() {
  const qc = useQueryClient()
  const week = currentWeek()
  const { data: leveling = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchMasterLeveling })
  const { data: existing = [] } = useQuery({ queryKey: ['priority_list', week], queryFn: () => fetchPriorityList(week) })
  const [params, setParams] = useState<Record<string, boolean[]>>({})
  const [preview, setPreview] = useState<Omit<PriorityListInterface, 'id'>[] | null>(null)

  const toggle = (skuId: string, idx: number) => {
    const cur = params[skuId] ?? Array<boolean>(6).fill(false)
    const next = [...cur]; next[idx] = !next[idx]
    setParams(p => ({ ...p, [skuId]: next }))
  }

  const handleGenerate = () => {
    const rows: Omit<PriorityListInterface, 'id'>[] = leveling.map(sku => {
      const p = params[sku.sku_id] ?? Array<boolean>(6).fill(false)
      const met = p.filter(Boolean).length
      return {
        week,
        sku_id: sku.sku_id,
        params_met: met,
        risk_score: sku.risk_score,
        priority: riskPriority(met),
        level: sku.level,
        status: 'Pending' as const,
        generated_at: new Date().toISOString(),
      }
    })
    setPreview(rows)
  }

  const save = useMutation({
    mutationFn: () => insertPriorityList(preview!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['priority_list'] }); setPreview(null) },
  })

  return (
    <section className="admin active" id="adm-generator">
      <Topbar title="Priority Generator" breadcrumb="Phase 2" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Priority Generator</h1>
            <p className="sub mb0">Score 6 risk parameters per SKU → generate this week's inspection priority list</p>
          </div>
          {!preview && (
            <button className="btn btn-primary lg" onClick={handleGenerate} disabled={leveling.length === 0}>
              ⚙️ Generate for {week}
            </button>
          )}
          {preview && (
            <div className="row">
              <button className="btn btn-outline" onClick={() => setPreview(null)}>← Back</button>
              <button className="btn btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Save Priority List</button>
            </div>
          )}
        </div>

        {!preview && (
          <>
            <div className="alert info">
              <span className="ic">ℹ️</span>
              <div>Check risk parameters per SKU this week. SKUs with <b>Manual flag</b> are locked at their level regardless of score.</div>
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ verticalAlign: 'bottom' }}>
                    <th style={{ minWidth: 160 }}>SKU</th>
                    <th style={{ minWidth: 60 }}>Level</th>
                    {PARAMS.map((p, i) => (
                      <th key={i} style={{ width: 44, minWidth: 44, padding: '0 4px 10px' }}>
                        <div style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          whiteSpace: 'nowrap',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          lineHeight: 1.2,
                        }}>{p}</div>
                      </th>
                    ))}
                    <th style={{ minWidth: 52 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leveling.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--secondaryText)' }}>No SKUs in leveling database</td></tr>
                  )}
                  {leveling.map(sku => {
                    const p = params[sku.sku_id] ?? Array<boolean>(6).fill(false)
                    const met = p.filter(Boolean).length
                    return (
                      <tr key={sku.sku_id}>
                        <td><div className="skuname">{sku.name}</div><div className="muted">{sku.sku_id}</div></td>
                        <td><b>{sku.level}</b></td>
                        {p.map((on, i) => (
                          <td key={i} style={{ textAlign: 'center', width: 44 }}>
                            <input type="checkbox" checked={on} onChange={() => toggle(sku.sku_id, i)} disabled={!!sku.manual_flag} />
                          </td>
                        ))}
                        <td>
                          <span className={`lab ${met >= 5 ? 'red' : met >= 3 ? 'orange' : 'grey'}`}>{met}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {preview && (
          <>
            <div className="alert success">
              <span className="ic">✅</span>
              <div>Generated {preview.length} SKUs for week {week}. Review below then save.</div>
            </div>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Level</th><th>Risk Score</th><th>Params Met</th><th>Priority</th></tr></thead>
                <tbody>
                  {preview.map(r => (
                    <tr key={r.sku_id}>
                      <td><div className="skuname">{leveling.find(l => l.sku_id === r.sku_id)?.name ?? r.sku_id}</div><div className="muted">{r.sku_id}</div></td>
                      <td><b>{r.level}</b></td>
                      <td>{r.risk_score}</td>
                      <td>{r.params_met}</td>
                      <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!preview && existing.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h3 className="section-title">Saved list for {week}</h3>
            <div className="card">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Level</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {existing.map((r: any) => (
                    <tr key={r.id}>
                      <td className="skuname">{r.master_leveling?.name ?? r.sku_id}</td>
                      <td><b>{r.level}</b></td>
                      <td><span className={`lab ${r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'orange' : 'grey'}`}>{r.priority}</span></td>
                      <td><span className={`lab ${r.status === 'Done' ? 'green' : 'grey'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
