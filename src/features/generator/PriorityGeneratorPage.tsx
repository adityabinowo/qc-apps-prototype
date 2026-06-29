import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Topbar } from '../../components/Topbar'
import { fetchMasterLeveling, fetchPriorityList, replacePriorityList, upsertLevelingBulk } from '../../data/queries'
import { levelFromPriority, riskPriority } from '../../lib/rules'
import { useAuth } from '../../context/AuthContext'

interface ParsedRow {
  product_id: string
  sku_number: string
  name: string
  param_wastage: number
  param_inbound: number
  param_topsku: number
  param_complaint: number
  risk_score: number
}

type Phase = 'idle' | 'running' | 'done' | 'error'

const STEPS = [
  'Reading spreadsheet…',
  'Syncing SKU leveling…',
  'Writing priority list…',
  'Done ✓',
]

function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
        const rows: ParsedRow[] = raw
          .map(r => ({
            product_id: String(r['product_id'] ?? r['Product ID'] ?? '').trim(),
            sku_number: String(r['sku_number'] ?? r['SKU Number'] ?? '').trim(),
            name: String(r['product_name'] ?? r['Product Name'] ?? '').trim(),
            param_wastage: Number(r['wastage_inventory_warehouse'] ?? 0),
            param_inbound: Number(r['inbound_to_bad_hub'] ?? 0),
            param_topsku: Number(r['top_sku_commercial'] ?? 0),
            param_complaint: Number(r['quality_complain'] ?? 0),
            risk_score: Number(r['total_parameter'] ?? 0),
          }))
          .filter(r => r.product_id !== '')
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function PriorityGeneratorPage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: leveling = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchMasterLeveling })
  const { data: existingList = [] } = useQuery({ queryKey: ['priority_list'], queryFn: fetchPriorityList })

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [showDiffTable, setShowDiffTable] = useState(false)

  const canRun = parsedRows !== null && parsedRows.length > 0 && phase === 'idle'

  const categoryMap = new Map(leveling.map(l => [l.sku_id, l.category]))

  // Diff against existing priority list
  const existingMap = new Map((existingList as any[]).map(r => [r.sku_id, r]))
  const parsedIds = new Set(parsedRows?.map(r => r.product_id) ?? [])
  const diffNew = parsedRows?.filter(r => !existingMap.has(r.product_id)) ?? []
  const diffRemoved = (existingList as any[]).filter(r => !parsedIds.has(r.sku_id))
  const diffChanged = parsedRows?.filter(r => {
    const ex = existingMap.get(r.product_id)
    return ex && riskPriority(r.risk_score) !== ex.priority
  }) ?? []
  const hasDiff = existingList.length > 0 && parsedRows !== null

  // Animate steps while running
  useEffect(() => {
    if (phase !== 'running') return
    if (stepIdx >= STEPS.length - 1) return
    const t = setTimeout(() => setStepIdx(i => i + 1), 900)
    return () => clearTimeout(t)
  }, [phase, stepIdx])

  const handleFile = async (file: File) => {
    setParseError('')
    setParsedRows(null)
    setPhase('idle')
    setErrorMsg('')
    setFileName(file.name)
    try {
      const rows = await parseSpreadsheet(file)
      if (rows.length === 0) { setParseError('No valid rows found. Check column headers.'); return }
      setParsedRows(rows)
    } catch {
      setParseError('Failed to parse file. Make sure it is a valid .xlsx or .csv.')
    }
  }

  const run = useMutation({
    mutationFn: async () => {
      if (!parsedRows) return
      setPhase('running')
      setStepIdx(0)
      const actor = auth.user?.id ?? 'system'

      // Step 1-2: Sync master_leveling FIRST (must exist before priority_list FK check)
      const levelingRows = parsedRows.map(row => ({
        sku_id: row.product_id,
        sku_number: row.sku_number,
        name: row.name,
        product_id: row.product_id,
        category: categoryMap.get(row.product_id) ?? ('Dry' as const),
        param_wastage: row.param_wastage,
        param_inbound: row.param_inbound,
        param_topsku: row.param_topsku,
        param_complaint: row.param_complaint,
        risk_score: row.risk_score,
        manual_flag: false,
      }))
      await upsertLevelingBulk(levelingRows, actor)

      // Step 3: Write priority list (after leveling rows exist)
      const priorityRows = parsedRows.map(row => ({
        sku_id: row.product_id,
        params_met: row.risk_score,
        param_wastage: row.param_wastage,
        param_inbound: row.param_inbound,
        param_topsku: row.param_topsku,
        param_complaint: row.param_complaint,
        risk_score: row.risk_score,
        priority: riskPriority(row.risk_score),
        level: levelFromPriority(riskPriority(row.risk_score)),
        status: 'Pending' as const,
        generated_at: new Date().toISOString(),
      }))
      await replacePriorityList(priorityRows)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priority_list'] })
      qc.invalidateQueries({ queryKey: ['priority_list_paged'] })
      qc.invalidateQueries({ queryKey: ['priority_list_summary'] })
      qc.invalidateQueries({ queryKey: ['leveling'] })
      setStepIdx(STEPS.length - 1)
      setTimeout(() => {
        setPhase('done')
        setTimeout(() => navigate('/app/priority-list'), 1200)
      }, 400)
    },
    onError: (err) => {
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed. Check Supabase logs.')
    },
  })

  return (
    <section className="admin active" id="adm-generator">
      <Topbar title="Priority Generator" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Priority Generator</h1>
            <p className="sub mb0">Upload the risk spreadsheet → generate the inspection priority list</p>
          </div>
          <button
            className="btn btn-primary lg"
            onClick={() => run.mutate()}
            disabled={!canRun}
          >
            ⚙️ Run
          </button>
        </div>

        {phase === 'idle' && (
          <div className="alert info">
            <span className="ic">ℹ️</span>
            <div>
              Upload the Superset export (.xlsx or .csv). Expected columns: <b>product_id · sku_number · product_name · wastage_inventory_warehouse · inbound_to_bad_hub · top_sku_commercial · quality_complain · total_parameter</b>.
              Running will replace the saved list and sync Master Leveling.
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="alert warn" style={{ marginBottom: 12 }}>
            <span className="ic">❌</span>
            <div><b>Run failed.</b> {errorMsg}</div>
          </div>
        )}

        {phase === 'done' && (
          <div className="alert success" style={{ marginBottom: 12 }}>
            <span className="ic">✅</span>
            <div>
              Priority list saved — <b>{parsedRows?.length} SKUs</b>. Master Leveling synced.
              {hasDiff && (
                <span style={{ marginLeft: 8 }}>
                  <b style={{ color: 'var(--success)' }}>+{diffNew.length} new</b>
                  {' · '}
                  <b style={{ color: 'var(--red)' }}>−{diffRemoved.length} removed</b>
                  {' · '}
                  <b>{diffChanged.length} priority changes</b>
                </span>
              )}
              <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>Redirecting to Saved Priority List…</span>
            </div>
          </div>
        )}

        {/* Upload zone */}
        {(
          <div
            className="card card-pad"
            style={{ cursor: 'pointer', textAlign: 'center', border: '2px dashed var(--border)', marginBottom: 20 }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 700 }}>{fileName || 'Click or drag & drop to upload'}</div>
            {parsedRows
              ? <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{parsedRows.length} SKUs parsed</div>
              : <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Accepts .xlsx · .csv</div>
            }
          </div>
        )}

        {parseError && (
          <div className="alert warn"><span className="ic">⚠️</span><div>{parseError}</div></div>
        )}

        {/* Diff panel */}
        {hasDiff && parsedRows && phase === 'idle' && (
          <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '3px solid var(--main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: diffChanged.length > 0 && showDiffTable ? 10 : 0 }}>
              <div style={{ fontSize: 13 }}>
                <b>vs. current saved list:</b>
                <span style={{ marginLeft: 10, color: 'var(--success)' }}>+{diffNew.length} new</span>
                <span style={{ marginLeft: 8, color: 'var(--red)' }}>−{diffRemoved.length} removed</span>
                <span style={{ marginLeft: 8 }}>⇄ {diffChanged.length} priority changes</span>
              </div>
              {diffChanged.length > 0 && (
                <button className="btn btn-naked" style={{ fontSize: 12 }} onClick={() => setShowDiffTable(v => !v)}>
                  {showDiffTable ? 'Hide ▲' : 'Show changes ▼'}
                </button>
              )}
            </div>
            {showDiffTable && diffChanged.length > 0 && (
              <div style={{ overflowX: 'auto', maxHeight: 240 }}>
                <table className="tbl" style={{ minWidth: 420 }}>
                  <thead>
                    <tr><th>SKU</th><th>Old priority</th><th>Old score</th><th>New priority</th><th>New score</th></tr>
                  </thead>
                  <tbody>
                    {diffChanged.map(row => {
                      const ex = existingMap.get(row.product_id)
                      const newPriority = riskPriority(row.risk_score)
                      return (
                        <tr key={row.product_id}>
                          <td><div className="skuname">{row.name || row.product_id}</div><div className="muted">{row.product_id}</div></td>
                          <td><span className={`lab ${ex?.priority === 'High' ? 'red' : ex?.priority === 'Medium' ? 'orange' : 'grey'}`}>{ex?.priority}</span></td>
                          <td><span className="lab grey">{ex?.risk_score ?? '—'}</span></td>
                          <td><span className={`lab ${newPriority === 'High' ? 'red' : newPriority === 'Medium' ? 'orange' : 'grey'}`}>{newPriority}</span></td>
                          <td><span className={`lab ${row.risk_score >= 4 ? 'red' : row.risk_score === 3 ? 'orange' : 'grey'}`}>{row.risk_score}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Parsed preview table */}
        {parsedRows && parsedRows.length > 0 && (
          <>
            <h3 className="section-title">Preview — {parsedRows.length} SKUs parsed from {fileName}</h3>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 680 }}>
                <thead>
                  <tr style={{ verticalAlign: 'bottom' }}>
                    <th style={{ minWidth: 160 }}>SKU</th>
                    {(['Wastage', 'Inbound', 'Top SKU', 'Complaint'] as const).map(h => (
                      <th key={h} style={{ width: 48, minWidth: 48, padding: '0 4px 10px' }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{h}</div>
                      </th>
                    ))}
                    <th style={{ minWidth: 52 }}>Score</th>
                    <th style={{ minWidth: 72 }}>Priority</th>
                    <th style={{ minWidth: 52 }}>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, i) => {
                    const priority = riskPriority(row.risk_score)
                    const level = levelFromPriority(priority)
                    return (
                      <tr key={i}>
                        <td>
                          <div className="skuname">{row.name || row.product_id}</div>
                          <div className="muted">{row.product_id}{row.sku_number ? ` · ${row.sku_number}` : ''}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{row.param_wastage}</td>
                        <td style={{ textAlign: 'center' }}>{row.param_inbound}</td>
                        <td style={{ textAlign: 'center' }}>{row.param_topsku}</td>
                        <td style={{ textAlign: 'center' }}>{row.param_complaint}</td>
                        <td><span className={`lab ${row.risk_score >= 4 ? 'red' : row.risk_score === 3 ? 'orange' : 'grey'}`}>{row.risk_score}</span></td>
                        <td><span className={`lab ${priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'grey'}`}>{priority}</span></td>
                        <td><b>{level}</b></td>
                      </tr>
                    )
                  })}
                  {parsedRows.length > 100 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--secondaryText)', fontSize: 12, padding: '10px' }}>
                        … and {parsedRows.length - 100} more rows (showing first 100)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Loading overlay */}
      {phase === 'running' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card card-pad" style={{ width: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>{STEPS[stepIdx]}</div>
            <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                background: 'var(--main)',
                height: '100%',
                width: `${Math.round((stepIdx + 1) / STEPS.length * 100)}%`,
                transition: 'width 0.7s ease',
                borderRadius: 99,
              }} />
            </div>
            <div className="muted" style={{ fontSize: 11 }}>Step {stepIdx + 1} of {STEPS.length} · {parsedRows?.length?.toLocaleString()} SKUs</div>
          </div>
        </div>
      )}
    </section>
  )
}
