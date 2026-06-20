import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import {
  compliance,
  coverageForLevel,
  decide,
  nextStates,
  nonConformityPct,
  riskPriority,
  samplingQty,
  verificationSampleQty,
} from './rules'

describe('samplingQty', () => {
  it('returns ceil(coverage% * soh)', () => {
    expect(samplingQty(20, 100)).toBe(20)
    expect(samplingQty(20, 7)).toBe(2)   // ceil(1.4)
    expect(samplingQty(50, 3)).toBe(2)   // ceil(1.5)
  })
  it('caps at soh', () => {
    expect(samplingQty(100, 5)).toBe(5)
    expect(samplingQty(200, 5)).toBe(5)  // can't exceed stock
  })
  it('returns 0 for soh=0', () => {
    expect(samplingQty(20, 0)).toBe(0)
  })
})

describe('nonConformityPct', () => {
  it('calculates %NC correctly', () => {
    expect(nonConformityPct(2, 40)).toBeCloseTo(5)
    expect(nonConformityPct(5, 25)).toBeCloseTo(20)
    expect(nonConformityPct(0, 10)).toBe(0)
  })
  it('guards division by zero', () => {
    expect(nonConformityPct(5, 0)).toBe(0)
  })
})

describe('decide', () => {
  it('Accepted ≤5%', () => {
    const r = decide(5)
    expect(r.band).toBe('Accepted')
    expect(r.proposesStatusChange).toBe(false)
  })
  it('Conditionally Accepted 6–20%', () => {
    const r = decide(10)
    expect(r.band).toBe('Conditionally Accepted')
    expect(r.proposesStatusChange).toBe(true)
  })
  it('Quarantine All >20%', () => {
    const r = decide(21)
    expect(r.band).toBe('Quarantine All')
    expect(r.proposesStatusChange).toBe(true)
  })
  it('boundary: exactly 20% is Conditionally Accepted', () => {
    expect(decide(20).band).toBe('Conditionally Accepted')
  })
})

describe('compliance', () => {
  it('≥95% → PASSED', () => {
    expect(compliance(95, 100).band).toBe('PASSED')
    expect(compliance(100, 100).band).toBe('PASSED')
  })
  it('75–94% → PASSED_WITH_NOTE', () => {
    expect(compliance(80, 100).band).toBe('PASSED_WITH_NOTE')
    expect(compliance(75, 100).band).toBe('PASSED_WITH_NOTE')
  })
  it('<75% → NOT_PASSED', () => {
    expect(compliance(74, 100).band).toBe('NOT_PASSED')
    expect(compliance(0, 100).band).toBe('NOT_PASSED')
  })
  it('guards division by zero', () => {
    expect(compliance(0, 0).pct).toBe(0)
  })
})

describe('verificationSampleQty', () => {
  it('uses config default 20%', () => {
    expect(verificationSampleQty(100)).toBe(20)
    expect(verificationSampleQty(10)).toBe(2)
  })
  it('minimum 1', () => {
    expect(verificationSampleQty(1)).toBe(1)
    expect(verificationSampleQty(2)).toBe(1)
  })
})

describe('riskPriority', () => {
  it('Low for 1–2 params', () => {
    expect(riskPriority(1)).toBe('Low')
    expect(riskPriority(2)).toBe('Low')
  })
  it('Medium for 3–4', () => {
    expect(riskPriority(3)).toBe('Medium')
    expect(riskPriority(4)).toBe('Medium')
  })
  it('High for ≥5', () => {
    expect(riskPriority(5)).toBe('High')
    expect(riskPriority(6)).toBe('High')
  })
})

describe('coverageForLevel', () => {
  it('returns correct % per level', () => {
    expect(coverageForLevel('LV1')).toBe(CONFIG.coverageLV1)
    expect(coverageForLevel('LV2')).toBe(CONFIG.coverageLV2)
    expect(coverageForLevel('LV3')).toBe(CONFIG.coverageLV3)
  })
})

describe('nextStates', () => {
  it('SUBMITTED can go to COMPLETED, PENDING_SORT, PENDING_APPROVAL', () => {
    expect(nextStates('SUBMITTED')).toContain('COMPLETED')
    expect(nextStates('SUBMITTED')).toContain('PENDING_APPROVAL')
  })
  it('terminal states return empty', () => {
    expect(nextStates('COMPLETED')).toHaveLength(0)
    expect(nextStates('WMS_WRITTEN')).toHaveLength(0)
  })
  it('unknown state returns empty', () => {
    expect(nextStates('BOGUS')).toHaveLength(0)
  })
})
