import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Topbar } from '../../components/Topbar'
import { FoodLoader } from '../../components/FoodLoader'
import { fetchHubs, fetchPriorityListSummary, generateTasks, uploadWmsInventory } from '../../data/queries'
import { useAuth } from '../../context/AuthContext'
import type { PriorityType } from '../../lib/types'

const SUPERSET_INVENTORY_URL = '__TODO_PROVIDE_LINK__'

// Numeric WMS location codes → hub IDs. Extend as more stores come online.
const LOCATION_TO_HUB: Record<string, string> = {
  '929': 'hub-salemba',
}

const ALL_PRIORITIES: PriorityType[] = ['High', 'Medium', 'Low']

const CAPTIONS = [
  'Counting what\'s on the shelves…',
  'Matching picks to the priority list…',
  'Dishing out tasks per hub…',
  'Served — tasks ready ✓',
]
const FLAVORS = [
  'Sniffing out bruised bananas…',
  'Sizing up the strawberries…',
  'Inspecting leaf and loin…',
  'Weighing the catch of the day…',
  'Checking expiry whispers…',
  'Counting blemishes, politely…',
]

interface InvRow {
  location_id: string
  product_id: string
  soh: number
  sloc: string
  expiry_date: string
}

type Phase = 'idle' | 'running' | 'done'

function currentWeek(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveHubId(locationId: string, hubId: string, hubs: { id: string; name: string }[]): string {
  if (LOCATION_TO_HUB[locationId]) return LOCATION_TO_HUB[locationId]
  const byId = hubs.find(h => h.id === locationId)
  if (byId) return byId.id
  const byName = hubs.find(h => h.name.toLowerCase().includes(locationId.toLowerCase().replace('hub ', '')))
  if (byName) return byName.id
  return hubId
}

function excelSerialToDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  if (raw instanceof Date) return (raw as Date).toISOString().slice(0, 10)
  const s = String(raw).trim()
  if (!s) return ''
  // Excel date serials for modern dates are 4-5 digit numbers (e.g. 46211.00013…)
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(parseFloat(s)) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  // Keep ISO / slash date strings (YYYY-MM-DD, DD/MM/YYYY, etc.)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // Any other value ("2", "N/A", partial numbers…) is not a valid date
  return ''
}

function parseInventory(file: File): Promise<InvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
        const rows: InvRow[] = raw
          .map(r => ({
            location_id: String(r['location_id'] ?? r['Location ID'] ?? '').trim(),
            // Real Superset export uses 'fpd.product_id'; fallback to legacy keys
            product_id: String(r['fpd.product_id'] ?? r['product_id'] ?? r['Product ID'] ?? '').trim(),
            // Real export uses 'stock' for SOH
            soh: Number(r['stock'] ?? r['soh'] ?? r['SOH'] ?? 0),
            // Real export uses 'rack_name' for SLOC
            sloc: String(r['rack_name'] ?? r['sloc'] ?? r['SLOC'] ?? '').trim(),
            expiry_date: excelSerialToDate(r['expiry_date'] ?? r['Expiry Date'] ?? ''),
          }))
          .filter(r => r.location_id !== '' && r.product_id !== '' && r.soh > 0)
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function TaskGeneratorPage() {
  const { auth } = useAuth()
  const selectedWeek = currentWeek()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: hubs = [] } = useQuery({ queryKey: ['hubs'], queryFn: fetchHubs })
  const { data: summary } = useQuery({ queryKey: ['priority_list_summary'], queryFn: fetchPriorityListSummary })
  const priorityTotal = summary?.total ?? 0

  const [invRows, setInvRows] = useState<InvRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityType[]>([...ALL_PRIORITIES])
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [summary2, setSummary2] = useState<Record<string, number>>({})

  // Map each inventory row's location_id to a resolved hub_id
  const resolvedRows = invRows?.map(r => ({ ...r, hub_id: resolveHubId(r.location_id, r.location_id, hubs) })) ?? []
  const resolvedHubIds = [...new Set(resolvedRows.map(r => r.hub_id))]

  const toggleHub = (id: string) =>
    setSelectedHubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const togglePriority = (p: PriorityType) =>
    setSelectedPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const handleFile = async (file: File) => {
    setParseError('')
    setInvRows(null)
    setSelectedHubs([])
    setPhase('idle')
    setSummary2({})
    setFileName(file.name)
    try {
      const rows = await parseInventory(file)
      if (rows.length === 0) { setParseError('No valid rows found. Check columns: location_id · fpd.product_id (or product_id) · stock (or soh) · rack_name (or sloc) · expiry_date'); return }
      setInvRows(rows)
    } catch {
      setParseError('Failed to parse file. Make sure it is a valid .xlsx or .csv.')
    }
  }

  useEffect(() => {
    if (phase !== 'running') return
    if (stepIdx >= CAPTIONS.length - 1) return
    const t = setTimeout(() => setStepIdx(i => i + 1), 700)
    return () => clearTimeout(t)
  }, [phase, stepIdx])

  const handleGenerate = async () => {
    if (!invRows || selectedHubs.length === 0 || priorityTotal === 0 || selectedPriorities.length === 0) return
    setPhase('running')
    setStepIdx(0)
    setSummary2({})

    try {
      const wmsRows = resolvedRows
        .filter(r => selectedHubs.includes(r.hub_id))
        .map(r => ({
          week: selectedWeek,
          hub_id: r.hub_id,
          product_id: r.product_id,
          sku_id: r.product_id,
          soh_available: r.soh,
          sloc: r.sloc,
          expiry_date: r.expiry_date || null,
        }))

      await uploadWmsInventory(selectedWeek, selectedHubs, wmsRows)
      const counts = await generateTasks(selectedWeek, selectedHubs, auth.user?.id ?? 'system', selectedPriorities)
      setSummary2(counts)
      setStepIdx(CAPTIONS.length - 1)
      setTimeout(() => setPhase('done'), 400)
    } catch (err) {
      setPhase('idle')
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err)
      setParseError(`Generation failed: ${msg}`)
    }
  }

  const canGenerate = invRows !== null && selectedHubs.length > 0 && priorityTotal > 0 && selectedPriorities.length > 0 && phase === 'idle'
  const totalGenerated = Object.values(summary2).reduce((a, b) => a + b, 0)

  return (
    <section className="admin active" id="adm-task-generator">
      <Topbar title="QC Task Generator" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">QC Task Generator</h1>
            <p className="sub mb0">Upload WMS inventory → match priority list → generate unassigned tasks per hub</p>
          </div>
          <button className="btn btn-primary lg" onClick={handleGenerate} disabled={!canGenerate}>
            🏭 Generate Tasks
          </button>
        </div>

        {/* Priority list status */}
        <div className={`alert ${priorityTotal > 0 ? 'info' : 'warn'}`} style={{ marginBottom: 20 }}>
          <span className="ic">{priorityTotal > 0 ? 'ℹ️' : '⚠️'}</span>
          <div>
            {priorityTotal > 0
              ? <><b>{priorityTotal.toLocaleString()} SKUs</b> in the priority list — ready to match against inventory.</>
              : <>No priority list found. Run the <b>Priority Generator</b> first.</>}
          </div>
        </div>

        {/* Step 1: Inventory upload */}
        <h3 className="section-title">Step 1 — Upload WMS Inventory</h3>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Columns: <b>location_id · fpd.product_id · stock · rack_name · expiry_date</b>
            <span style={{ marginLeft: 8, opacity: .6 }}>(also accepts product_id / soh / sloc)</span>
          </span>
          {SUPERSET_INVENTORY_URL !== '__TODO_PROVIDE_LINK__' && (
            <a href={SUPERSET_INVENTORY_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: 12 }}>
              ↗ Download from Superset
            </a>
          )}
        </div>
        <div
          className="card card-pad"
          style={{ cursor: 'pointer', textAlign: 'center', border: '2px dashed var(--border)', marginBottom: 20 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 700 }}>{fileName || 'Click or drag & drop to upload'}</div>
          {invRows
            ? <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{invRows.length} rows · {resolvedHubIds.length} location(s) resolved</div>
            : <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Accepts .xlsx · .csv</div>
          }
        </div>

        {parseError && <div className="alert warn"><span className="ic">⚠️</span><div>{parseError}</div></div>}

        {/* Step 2: Hub + Priority selection */}
        {invRows && (
          <>
            <h3 className="section-title">Step 2 — Select Hubs &amp; Priorities</h3>
            <div className="card card-pad" style={{ marginBottom: 20 }}>
              {hubs.length === 0 && <p className="muted">No hubs found in the database.</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {hubs.map(hub => {
                  const hasInv = resolvedHubIds.includes(hub.id)
                  const invCount = resolvedRows.filter(r => r.hub_id === hub.id).length
                  return (
                    <label
                      key={hub.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                        border: `1.5px solid ${selectedHubs.includes(hub.id) ? 'var(--main)' : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: selectedHubs.includes(hub.id) ? 'var(--mainFaded)' : '#fff',
                        opacity: !hasInv ? 0.45 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedHubs.includes(hub.id)}
                        disabled={!hasInv}
                        onChange={() => toggleHub(hub.id)}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{hub.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {hasInv ? `${invCount} rows with SOH > 0` : 'No inventory data'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Priority chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondaryText)' }}>Priorities:</span>
                {ALL_PRIORITIES.map(p => {
                  const on = selectedPriorities.includes(p)
                  const color = p === 'High' ? 'var(--tag-red-text, #EC465C)' : p === 'Medium' ? 'var(--tag-orange-text, #FA591D)' : 'var(--secondaryText)'
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: `1.5px solid ${on ? color : 'var(--border)'}`,
                        background: on ? 'var(--softGrey)' : '#fff',
                        color: on ? color : 'var(--secondaryText)',
                      }}
                    >
                      {p}
                    </button>
                  )
                })}
                {selectedPriorities.length === 0 && (
                  <span className="muted" style={{ fontSize: 11 }}>Select at least one priority to generate</span>
                )}
              </div>

              {selectedHubs.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--secondaryText)' }}>
                  {selectedHubs.length} hub(s) · {selectedPriorities.join(', ')} priority — tasks will be created unassigned
                </div>
              )}
            </div>
          </>
        )}

        {/* Done summary */}
        {phase === 'done' && (
          <>
            <div className="alert success" style={{ marginBottom: 20 }}>
              <span className="ic">✅</span>
              <div><b>{totalGenerated.toLocaleString()} tasks generated</b> — unassigned. Go to Task Management to assign officers.</div>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              {Object.entries(summary2).map(([hubId, count]) => {
                const hub = hubs.find(h => h.id === hubId)
                return (
                  <div key={hubId} className="card card-pad" style={{ minWidth: 180, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--main)' }}>{count.toLocaleString()}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{hub?.name ?? hubId}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{hub?.location ?? ''}</div>
                  </div>
                )
              })}
              <div className="card card-pad" style={{ minWidth: 180, flex: 1, background: 'var(--mainFaded)', border: '1.5px solid var(--main)' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--main)' }}>{totalGenerated.toLocaleString()}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Total tasks</div>
                <div className="muted" style={{ fontSize: 11 }}>across {selectedHubs.length} hub(s)</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Loading overlay */}
      {phase === 'running' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card card-pad" style={{ width: 420, textAlign: 'center' }}>
            <FoodLoader
              caption={CAPTIONS[stepIdx]}
              activeStep={stepIdx}
              totalSteps={CAPTIONS.length}
              flavor={FLAVORS[stepIdx % FLAVORS.length]}
            />
          </div>
        </div>
      )}
    </section>
  )
}
