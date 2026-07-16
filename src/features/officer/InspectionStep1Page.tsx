import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { TaskInterface, StockInterface } from '../../lib/types'

const STORAGE_CONDITIONS = ['Suhu OK', 'Suhu tidak sesuai', 'Kemasan rusak', 'Area kotor']
const TEXTURE_OPTIONS = ['Normal', 'Toleransi', 'Tidak Normal']
const SEAL_OPTIONS = ['Normal', 'Rusak', 'Bocor']
const CLEANLINESS_OPTIONS = ['Normal', 'Kotor']

function ChipField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              border: `1px solid ${value === o ? '#291D80' : '#d8e2ec'}`,
              background: value === o ? '#E8EFFB' : '#fff',
              color: value === o ? '#291D80' : '#5a6a84',
              borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function InspectionStep1Page() {
  const { state } = useLocation() as { state?: { task: TaskInterface; stock: StockInterface; sampleQty: number } }
  const navigate = useNavigate()
  const [productTemp, setProductTemp] = useState('')
  const [storageCondition, setStorageCondition] = useState('Suhu OK')
  const [earlyStop, setEarlyStop] = useState(false)
  const [earlyReason, setEarlyReason] = useState('')
  const [color, setColor] = useState('')
  const [texture, setTexture] = useState('Normal')
  const [packaging, setPackaging] = useState('')
  const [seal, setSeal] = useState('Normal')
  const [cleanliness, setCleanliness] = useState('Normal')

  if (!state?.task) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat,sans-serif' }}>
        <p>No task loaded.</p>
        <button onClick={() => navigate('/app/officer/inbox')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #291D80', background: 'none', cursor: 'pointer', marginTop: 12 }}>Back to Inbox</button>
      </div>
    )
  }

  const { task, stock, sampleQty } = state

  const handleNext = () => {
    navigate('/app/officer/step2', { state: { task, stock, sampleQty, step1: { productTemp, storageCondition, earlyStop, earlyReason, color, texture, packaging, seal, cleanliness } } })
  }

  return (
    <div style={{ background: '#F6F8FB', minHeight: '100vh', fontFamily: 'Montserrat,sans-serif' }}>
      <div style={{ background: '#291D80', color: '#fff', padding: '16px 20px 14px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 4, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Inspection · Step 1 of 2</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{stock.name}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '12px 14px 0' }}>
        {[1, 2].map(n => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: n === 1 ? '#291D80' : '#d8e2ec' }} />
        ))}
      </div>
      <div style={{ padding: '16px 14px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🧊 Storage Conditions</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Product Temperature (°C) *</label>
            <input
              type="number" step="0.1"
              value={productTemp}
              onChange={e => setProductTemp(e.target.value)}
              placeholder="e.g. 4.5"
              style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Storage Condition</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STORAGE_CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setStorageCondition(c)}
                  style={{
                    border: `1px solid ${storageCondition === c ? '#291D80' : '#d8e2ec'}`,
                    background: storageCondition === c ? '#E8EFFB' : '#fff',
                    color: storageCondition === c ? '#291D80' : '#5a6a84',
                    borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={earlyStop} onChange={e => setEarlyStop(e.target.checked)} />
            <span>Early stop — Quarantine All (critical storage failure)</span>
          </label>
          {earlyStop && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason *</label>
              <input
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                placeholder="Describe the critical issue…"
                style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
        {!earlyStop && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #e8edf5', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔎 Physical Checklist</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Color</label>
              <input
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="e.g. Normal"
                style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <ChipField label="Texture" options={TEXTURE_OPTIONS} value={texture} onChange={setTexture} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#5a6a84', fontWeight: 600, display: 'block', marginBottom: 6 }}>Packaging</label>
              <input
                value={packaging}
                onChange={e => setPackaging(e.target.value)}
                placeholder="e.g. Normal"
                style={{ width: '100%', border: '1px solid #d8e2ec', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <ChipField label="Seal" options={SEAL_OPTIONS} value={seal} onChange={setSeal} />
            <ChipField label="Cleanliness" options={CLEANLINESS_OPTIONS} value={cleanliness} onChange={setCleanliness} />
          </div>
        )}
        <button
          onClick={handleNext}
          disabled={!productTemp || (earlyStop && !earlyReason)}
          style={{ width: '100%', background: '#291D80', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (!productTemp || (earlyStop && !earlyReason)) ? 0.5 : 1 }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
