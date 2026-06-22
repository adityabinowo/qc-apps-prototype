import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Topbar } from '../../components/Topbar'
import { fetchMasterLeveling, fetchWeeks, replacePriorityList, upsertLevelingBulk } from '../../data/queries'
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

function currentWeek(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

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
  const today = currentWeek()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: weeksFromDb = [] } = useQuery({ queryKey: ['weeks'], queryFn: fetchWeeks })
  const { data: leveling = [] } = useQuery({ queryKey: ['leveling'], queryFn: fetchMasterLeveling })

  const [selectedWeek, setSelectedWeek] = useState(today)
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [done, setDone] = useState(false)

  const allWeeks = [...new Set([today, ...weeksFromDb])].sort().reverse()
  const isPast = selectedWeek < today
  const canRun = !isPast && parsedRows !== null && parsedRows.length > 0

  const categoryMap = new Map(leveling.map(l => [l.sku_id, l.category]))

  const handleFile = async (file: File) => {
    setParseError('')
    setParsedRows(null)
    setDone(false)
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
      const actor = auth.user?.id ?? 'system'

      const priorityRows = parsedRows.map(row => ({
        week: selectedWeek,
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

      await replacePriorityList(selectedWeek, priorityRows)
      await upsertLevelingBulk(levelingRows, actor)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priority_list'] })
      qc.invalidateQueries({ queryKey: ['leveling'] })
      qc.invalidateQueries({ queryKey: ['weeks'] })
      setDone(true)
    },
  })

  return (
    <section className="admin active" id="adm-generator">
      <Topbar title="Priority Generator" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">Priority Generator</h1>
            <p className="sub mb0">Upload the weekly risk spreadsheet → generate this week's inspection priority list</p>
          </div>
          <div className="row">
            <select
              className="inp"
              value={selectedWeek}
              onChange={e => { setSelectedWeek(e.target.value); setParsedRows(null); setDone(false) }}
            >
              {allWeeks.map(w => (
                <option key={w} value={w}>{w}{w === today ? ' (current)' : ''}</option>
              ))}
            </select>
            <button
              className="btn btn-primary lg"
              onClick={() => run.mutate()}
              disabled={!canRun || run.isPending}
            >
              {run.isPending ? '⏳ Running…' : `⚙️ Run for ${selectedWeek}`}
            </button>
          </div>
        </div>

        {isPast && (
          <div className="alert warn">
            <span className="ic">🔒</span>
            <div>Past week selected — view only. Switch to the current week to regenerate.</div>
          </div>
        )}

        {!isPast && (
          <div className="alert info">
            <span className="ic">ℹ️</span>
            <div>
              Upload the Superset export (.xlsx or .csv). Expected columns: <b>product_id · sku_number · product_name · wastage_inventory_warehouse · inbound_to_bad_hub · top_sku_commercial · quality_complain · total_parameter</b>.
              Running will replace the saved list for <b>{selectedWeek}</b> and sync Master Leveling (manual-flagged SKUs are skipped).
            </div>
          </div>
        )}

        {done && (
          <div className="alert success">
            <span className="ic">✅</span>
            <div>Priority list for <b>{selectedWeek}</b> saved — {parsedRows?.length} SKUs written. Master Leveling synced.</div>
          </div>
        )}

        {/* Upload zone */}
        {!isPast && (
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
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Accepts .xlsx · .csv</div>
          </div>
        )}

        {parseError && (
          <div className="alert warn"><span className="ic">⚠️</span><div>{parseError}</div></div>
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
                  {parsedRows.map((row, i) => {
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
                        <td>
                          <span className={`lab ${row.risk_score >= 4 ? 'red' : row.risk_score === 3 ? 'orange' : 'grey'}`}>{row.risk_score}</span>
                        </td>
                        <td><span className={`lab ${priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'grey'}`}>{priority}</span></td>
                        <td><b>{level}</b></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
