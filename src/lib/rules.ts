import { CONFIG } from './config'
import type { DecisionBandType, LevelType, PriorityType, VerificationBandType } from './types'

export interface DecisionResultInterface {
  band: DecisionBandType
  recommendedAction: string
  proposesStatusChange: boolean
}

export interface ComplianceResultInterface {
  pct: number
  band: VerificationBandType
  action: string
}

/** Sampling quantity per PRD: min(ceil(coverage% * soh), soh) */
export function samplingQty(coveragePct: number, soh: number): number {
  if (soh <= 0) return 0
  return Math.min(Math.ceil((coveragePct / 100) * soh), soh)
}

/** %NC: totalDefect / samplingQty * 100 */
export function nonConformityPct(totalDefect: number, qty: number): number {
  if (qty <= 0) return 0
  return (totalDefect / qty) * 100
}

/** Decision matrix per §5 */
export function decide(
  ncPct: number,
  config: typeof CONFIG = CONFIG,
): DecisionResultInterface {
  if (ncPct <= config.acceptedMax) {
    return {
      band: 'Accepted',
      recommendedAction: 'No stock status change required.',
      proposesStatusChange: false,
    }
  }
  if (ncPct <= config.conditionalMax) {
    return {
      band: 'Conditionally Accepted',
      recommendedAction: 'Sort bad units and submit found-bad status change.',
      proposesStatusChange: true,
    }
  }
  return {
    band: 'Quarantine All',
    recommendedAction: 'Quarantine entire batch. Submit Bad status change for approval.',
    proposesStatusChange: true,
  }
}

/** SPV verification compliance */
export function compliance(
  goodQty: number,
  qtyChecked: number,
  config: typeof CONFIG = CONFIG,
): ComplianceResultInterface {
  const pct = qtyChecked > 0 ? (goodQty / qtyChecked) * 100 : 0
  if (pct >= config.compliancePassedMin) {
    return { pct, band: 'PASSED', action: 'Continue inspection as normal.' }
  }
  if (pct >= config.complianceNoteMin) {
    return { pct, band: 'PASSED_WITH_NOTE', action: 'Re-check flagged items.' }
  }
  return { pct, band: 'NOT_PASSED', action: 'Trigger full re-inspection.' }
}

/** Verification sample size (20% of qty checked) */
export function verificationSampleQty(
  qtyChecked: number,
  pct: number = CONFIG.verifSamplePct,
): number {
  return Math.max(1, Math.ceil((pct / 100) * qtyChecked))
}

/** Risk priority bucket per §5 */
export function riskPriority(
  paramsMet: number,
  config: typeof CONFIG = CONFIG,
): PriorityType {
  if (paramsMet >= config.riskHighMin) return 'High'
  if (paramsMet >= config.riskMediumMin) return 'Medium'
  return 'Low'
}

/** Coverage % for a given level */
export function coverageForLevel(level: LevelType, config: typeof CONFIG = CONFIG): number {
  if (level === 'LV1') return config.coverageLV1
  if (level === 'LV2') return config.coverageLV2
  return config.coverageLV3
}

/** Allowed next lifecycle states — enforces the state machine from plan §5 */
export function nextStates(current: string): string[] {
  const map: Record<string, string[]> = {
    SUBMITTED: ['COMPLETED', 'PENDING_SORT', 'PENDING_APPROVAL'],
    PENDING_SORT: ['PENDING_APPROVAL'],
    PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
    APPROVED: ['WMS_WRITTEN'],
    WMS_WRITTEN: [],
    COMPLETED: [],
    REJECTED: [],
    SELECTED: ['RE_INSPECTED'],
    RE_INSPECTED: [],
  }
  return map[current] ?? []
}
