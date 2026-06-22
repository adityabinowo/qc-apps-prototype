export const CONFIG = {
  // Decision bands (§5 plan, %NC)
  acceptedMax: 5,          // 0–5% → Accepted
  conditionalMax: 20,      // 6–20% → Conditionally Accepted; >20 → Quarantine All

  // Coverage % per level (PRD v1.1 §LV)
  coverageLV1: 20,
  coverageLV2: 50,
  coverageLV3: 70,

  // Verification sample % (§5 plan)
  verifSamplePct: 20,

  // Compliance bands (§5)
  compliancePassedMin: 95,     // ≥95 → PASSED
  complianceNoteMin: 75,       // 75–94 → PASSED_WITH_NOTE; <75 → NOT_PASSED

  // Task defaults
  taskDeadlineHour: 18,        // default deadline 18:00 local

  // Risk priority thresholds
  riskMediumMin: 3,
  riskHighMin: 4,
} as const

export type ConfigType = typeof CONFIG
