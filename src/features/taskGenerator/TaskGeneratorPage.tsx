import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Topbar } from '../../components/Topbar'
import { fetchHubs, fetchPriorityList, fetchWeeks, generateTasks, uploadWmsInventory } from '../../data/queries'
import { useAuth } from '../../context/AuthContext'

const SUPERSET_INVENTORY_URL = '__TODO_PROVIDE_LINK__'

interface InvRow {
  location_id: string
  product_id: string
  soh: number
  sloc: string
  expiry_date: string
}

type Phase = 'idle' | 'running' | 'done'

const STEPS = [
  'Reading inventory…',
  'Matching priority list…',
  'Creating tasks for hubs…',
  'Done ✓',
]

function currentWeek(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
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
            product_id: String(r['product_id'] ?? r['Product ID'] ?? '').trim(),
            soh: Number(r['soh'] ?? r['SOH'] ?? 0),
            sloc: String(r['sloc'] ?? r['SLOC'] ?? '').trim(),
            expiry_date: String(r['expiry_date'] ?? r['Expiry Date'] ?? '').trim(),
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
  const today = currentWeek()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: weeksFromDb = [] } = useQuery({ queryKey: ['weeks'], queryFn: fetchWeeks })
  const { data: hubs = [] } = useQuery({ queryKey: ['hubs'], queryFn: fetchHubs })

  const [selectedWeek, setSelectedWeek] = useState(today)
  const { data: priorityRows = [] } = useQuery({
    queryKey: ['priority_list', selectedWeek],
    queryFn: () => fetchPriorityList(selectedWeek),
  })

  const [invRows, setInvRows] = useState<InvRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [summary, setSummary] = useState<Record<string, number>>({})

  const allWeeks = [...new Set([today, ...weeksFromDb])].sort().reverse()

  // location_ids found in uploaded file
  const locationIds = invRows ? [...new Set(invRows.map(r => r.location_id))] : []

  const toggleHub = (id: string) =>
    setSelectedHubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleFile = async (file: File) => {
    setParseError('')
    setInvRows(null)
    setSelectedHubs([])
    setPhase('idle')
    setSummary({})
    setFileName(file.name)
    try {
      const rows = await parseInventory(file)
      if (rows.length === 0) { setParseError('No valid rows found (need location_id, product_id, soh > 0).'); return }
      setInvRows(rows)
    } catch {
      setParseError('Failed to parse file. Make sure it is a valid .xlsx or .csv.')
    }
  }

  // Animate steps while running
  useEffect(() => {
    if (phase !== 'running') return
    if (stepIdx >= STEPS.length - 1) return
    const t = setTimeout(() => setStepIdx(i => i + 1), 700)
    return () => clearTimeout(t)
  }, [phase, stepIdx])

  const handleGenerate = async () => {
    if (!invRows || selectedHubs.length === 0 || priorityRows.length === 0) return
    setPhase('running')
    setStepIdx(0)
    setSummary({})

    try {
      // Build wms_inventory rows
      const wmsRows = invRows
        .filter(r => selectedHubs.some(hid => hid === r.location_id || hubs.find(h => h.id === hid)?.name.toLowerCase().includes(r.location_id.toLowerCase().replace('hub ', ''))))
        .map(r => {
          const hub = selectedHubs.find(hid => hid === r.location_id) ??
            hubs.find(h => r.location_id === h.id || h.name.toLowerCase().includes(r.location_id.toLowerCase().replace('hub ', '')))?.id ?? r.location_id
          return {
            week: selectedWeek,
            hub_id: hub,
            product_id: r.product_id,
            sku_id: r.product_id,
            soh_available: r.soh,
            sloc: r.sloc,
            expiry_date: r.expiry_date || null,
          }
        })

      await uploadWmsInventory(selectedWeek, selectedHubs, wmsRows)
      const counts = await generateTasks(selectedWeek, selectedHubs, auth.user?.id ?? 'system')
      setSummary(counts)
      setStepIdx(STEPS.length - 1)
      setTimeout(() => setPhase('done'), 400)
    } catch (err) {
      setPhase('idle')
      setParseError(err instanceof Error ? err.message : 'Generation failed.')
    }
  }

  const canGenerate = invRows && selectedHubs.length > 0 && priorityRows.length > 0 && phase === 'idle'
  const totalGenerated = Object.values(summary).reduce((a, b) => a + b, 0)

  return (
    <section className="admin active" id="adm-task-generator">
      <Topbar title="QC Task Generator" breadcrumb="QC Task Generator" />
      <div className="page">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="h1">QC Task Generator</h1>
            <p className="sub mb0">Upload WMS inventory → match priority list → generate unassigned tasks per hub</p>
          </div>
          <div className="row">
            <select className="inp" value={selectedWeek} onChange={e => { setSelectedWeek(e.target.value); setPhase('idle'); setSummary({}) }}>
              {allWeeks.map(w => <option key={w} value={w}>{w}{w === today ? ' (current)' : ''}</option>)}
            </select>
            <button className="btn btn-primary lg" onClick={handleGenerate} disabled={!canGenerate}>
              🏭 Generate Tasks
            </button>
          </div>
        </div>

        {/* Priority list status */}
        <div className={`alert ${priorityRows.length > 0 ? 'info' : 'warn'}`} style={{ marginBottom: 20 }}>
          <span className="ic">{priorityRows.length > 0 ? 'ℹ️' : '⚠️'}</span>
          <div>
            {priorityRows.length > 0
              ? <><b>{priorityRows.length} SKUs</b> in the priority list for <b>{selectedWeek}</b> — ready to match against inventory.</>
              : <>No priority list found for <b>{selectedWeek}</b>. Run the <b>Priority Generator</b> first.</>}
          </div>
        </div>

        {/* Step 1: Inventory upload */}
        <h3 className="section-title">Step 1 — Upload WMS Inventory</h3>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>Expected columns: <b>location_id · product_id · soh · sloc · expiry_date</b></span>
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
          {invRows && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{invRows.length} available rows · {locationIds.length} location(s) found</div>}
          {!invRows && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Accepts .xlsx · .csv</div>}
        </div>

        {parseError && <div className="alert warn"><span className="ic">⚠️</span><div>{parseError}</div></div>}

        {/* Step 2: Hub selection */}
        {invRows && (
          <>
            <h3 className="section-title">Step 2 — Select Hubs</h3>
            <div className="card card-pad" style={{ marginBottom: 20 }}>
              {hubs.length === 0 && <p className="muted">No hubs found in the database.</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {hubs.map(hub => {
                  const hasInv = locationIds.some(lid => lid === hub.id || lid.toLowerCase().includes(hub.name.toLowerCase().replace('hub ', '')) || hub.id.includes(lid))
                  const invCount = invRows.filter(r => r.location_id === hub.id || hub.name.toLowerCase().includes(r.location_id.toLowerCase().replace('hub ', ''))).length
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
                          {hasInv ? `${invCount} SKUs with SOH > 0` : 'No inventory data'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {selectedHubs.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--secondaryText)' }}>
                  {selectedHubs.length} hub(s) selected · tasks will be created unassigned (assign officers in Task Management)
                </div>
              )}
            </div>
          </>
        )}

        {/* Done summary */}
        {phase === 'done' && totalGenerated >= 0 && (
          <>
            <div className="alert success" style={{ marginBottom: 20 }}>
              <span className="ic">✅</span>
              <div><b>{totalGenerated} tasks generated</b> for week {selectedWeek} — unassigned. Go to Task Management to assign officers.</div>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              {Object.entries(summary).map(([hubId, count]) => {
                const hub = hubs.find(h => h.id === hubId)
                return (
                  <div key={hubId} className="card card-pad" style={{ minWidth: 180, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--main)' }}>{count}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{hub?.name ?? hubId}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{hub?.location ?? ''}</div>
                  </div>
                )
              })}
              <div className="card card-pad" style={{ minWidth: 180, flex: 1, background: 'var(--mainFaded)', border: '1.5px solid var(--main)' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--main)' }}>{totalGenerated}</div>
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
          <div className="card card-pad" style={{ width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>{STEPS[stepIdx]}</div>
            <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                background: 'var(--main)',
                height: '100%',
                width: `${Math.round((stepIdx + 1) / STEPS.length * 100)}%`,
                transition: 'width 0.6s ease',
                borderRadius: 99,
              }} />
            </div>
            <div className="muted" style={{ fontSize: 11 }}>Step {stepIdx + 1} of {STEPS.length}</div>
          </div>
        </div>
      )}
    </section>
  )
}
