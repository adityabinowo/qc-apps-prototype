export type RoleType = 'officer' | 'spv' | 'px'

export type TaskStatusType = 'Pending' | 'In Progress' | 'Done' | 'Overdue'
export type PriorityType = 'Low' | 'Medium' | 'High'
export type LevelType = 'LV1' | 'LV2' | 'LV3'
export type StockStatusType = 'Available' | 'Bad'
export type CategoryType = 'Fresh' | 'Frozen' | 'Dry'
export type LifecycleStateType =
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'PENDING_SORT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'WMS_WRITTEN'
  | 'REJECTED'
  | 'SELECTED'
  | 'RE_INSPECTED'
export type StatusChangeStateType = 'Pending' | 'Approved' | 'Rejected'
export type VerificationBandType = 'PASSED' | 'PASSED_WITH_NOTE' | 'NOT_PASSED'
export type DecisionBandType = 'Accepted' | 'Conditionally Accepted' | 'Quarantine All'

export interface HubInterface {
  id: string
  name: string
  location: string
}

export interface UserInterface {
  id: string
  name: string
  email: string
  role: RoleType
  hub_id: string
}

export interface StockInterface {
  sku_id: string
  name: string
  product_id: string
  category: CategoryType
  sloc: string
  soh: number
  msltc: number
  last_ed: string
  stock_status: StockStatusType
}

export interface MasterLevelingInterface {
  sku_id: string
  sku_number?: string
  name: string
  product_id: string
  category: CategoryType
  param_wastage?: number
  param_inbound?: number
  param_topsku?: number
  param_complaint?: number
  risk_score: number
  priority: PriorityType
  level: LevelType
  coverage_pct: number
  manual_flag: boolean
  updated_at: string
  updated_by: string
}

export interface LevelingChangelogInterface {
  id: string
  sku_id: string
  field: string
  old: string
  new: string
  actor: string
  ts: string
}

export interface PriorityListInterface {
  id: string
  sku_id: string
  params_met: number
  param_wastage?: number
  param_inbound?: number
  param_topsku?: number
  param_complaint?: number
  risk_score: number
  priority: PriorityType
  level: LevelType
  status: 'Pending' | 'Done'
  generated_at: string
}

export interface TaskInterface {
  id: string
  sku_id: string
  hub_id: string
  officer_id: string | null
  priority: PriorityType
  level: LevelType
  coverage_pct: number
  deadline: string
  instructions: string
  status: TaskStatusType
  source?: 'manual' | 'generated' | 'bulk'
  assigned_at?: string | null
  created_by: string
  created_at: string
}

export interface WmsInventoryInterface {
  id: string
  week: string
  hub_id: string
  product_id: string
  sku_id: string
  soh_available: number
  sloc: string
  expiry_date: string | null
  uploaded_at: string
}

export interface InspectionInterface {
  id: string
  task_id: string
  sku_id: string
  officer_id: string
  hub_id: string
  soh: number
  sampling_qty: number
  product_temp: number | null
  prod_date: string | null
  exp_date: string | null
  qty_good: number
  qty_bad: number
  total_defect: number
  defect_reasons: string[]
  defect_desc: string
  nc_pct: number
  decision: DecisionBandType
  recommended_action: string
  proposed_status: StockStatusType | null
  lifecycle_state: LifecycleStateType
  created_at: string
}

export interface InspectionPhotoInterface {
  id: string
  inspection_id: string
  url: string
  is_defect: boolean
}

export interface StatusChangeInterface {
  id: string
  inspection_id: string
  sku_id: string
  hub_id: string
  old_status: StockStatusType
  new_status: StockStatusType
  state: StatusChangeStateType
  reason: string
  source: 'inspection' | 'verification'
  submitted_at: string
  decided_by: string | null
  decided_at: string | null
}

export interface VerificationInterface {
  id: string
  inspection_id: string
  spv_id: string
  officer_id: string
  qty_checked: number
  sample_qty: number
  good_qty: number
  match_flag: boolean
  severity: string | null
  defect_type: string | null
  defect_qty: number | null
  wastage_reason: string | null
  compliance_pct: number
  band: VerificationBandType
  created_at: string
}

export interface AuditLogInterface {
  id: string
  entity: string
  entity_id: string
  action: string
  payload: Record<string, unknown>
  actor: string
  ts: string
}

export interface AuthStateInterface {
  user: UserInterface | null
  hub: HubInterface | null
  isAuthenticated: boolean
}
