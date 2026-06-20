import { supabase } from '../lib/supabase'
import type {
  HubInterface,
  InspectionInterface,
  MasterLevelingInterface,
  StatusChangeInterface,
  StockInterface,
  TaskInterface,
  UserInterface,
  VerificationInterface,
} from '../lib/types'

// ── Hubs ──────────────────────────────────────────────────────────────────────

export async function fetchHubs(): Promise<HubInterface[]> {
  const { data, error } = await supabase.from('hubs').select('*').order('name')
  if (error) throw error
  return data as HubInterface[]
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<UserInterface[]> {
  const { data, error } = await supabase.from('users').select('*').order('name')
  if (error) throw error
  return data as UserInterface[]
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function fetchStock(hubId?: string): Promise<StockInterface[]> {
  let q = supabase.from('stock').select('*').order('name')
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q
  if (error) throw error
  return data as StockInterface[]
}

// ── Master Leveling ───────────────────────────────────────────────────────────

export async function fetchMasterLeveling(): Promise<MasterLevelingInterface[]> {
  const { data, error } = await supabase.from('master_leveling').select('*').order('name')
  if (error) throw error
  return data as MasterLevelingInterface[]
}

export async function upsertLeveling(row: Partial<MasterLevelingInterface>): Promise<void> {
  const { error } = await supabase.from('master_leveling').upsert(row)
  if (error) throw error
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(hubId?: string): Promise<TaskInterface[]> {
  let q = supabase.from('tasks').select('*').order('deadline')
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q
  if (error) throw error
  return data as TaskInterface[]
}

export async function createTask(task: Omit<TaskInterface, 'id' | 'created_at'>): Promise<TaskInterface> {
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data as TaskInterface
}

export async function updateTaskStatus(id: string, status: TaskInterface['status']): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) throw error
}

// ── Inspections ───────────────────────────────────────────────────────────────

export async function fetchInspections(hubId?: string): Promise<InspectionInterface[]> {
  let q = supabase.from('inspections').select('*').order('created_at', { ascending: false })
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q
  if (error) throw error
  return data as InspectionInterface[]
}

export async function createInspection(
  inspection: Omit<InspectionInterface, 'id' | 'created_at'>,
): Promise<InspectionInterface> {
  const { data, error } = await supabase.from('inspections').insert(inspection).select().single()
  if (error) throw error
  return data as InspectionInterface
}

export async function updateInspectionLifecycle(
  id: string,
  state: InspectionInterface['lifecycle_state'],
): Promise<void> {
  const { error } = await supabase.from('inspections').update({ lifecycle_state: state }).eq('id', id)
  if (error) throw error
}

// ── Status Changes ────────────────────────────────────────────────────────────

export async function fetchPendingStatusChanges(): Promise<StatusChangeInterface[]> {
  const { data, error } = await supabase
    .from('status_changes')
    .select('*')
    .eq('state', 'Pending')
    .order('submitted_at')
  if (error) throw error
  return data as StatusChangeInterface[]
}

export async function decideStatusChange(
  id: string,
  state: 'Approved' | 'Rejected',
  decidedBy: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase
    .from('status_changes')
    .update({ state, decided_by: decidedBy, decided_at: new Date().toISOString(), reason: reason ?? null })
    .eq('id', id)
  if (error) throw error
}

// ── Verifications ─────────────────────────────────────────────────────────────

export async function createVerification(
  v: Omit<VerificationInterface, 'id' | 'created_at'>,
): Promise<VerificationInterface> {
  const { data, error } = await supabase.from('verifications').insert(v).select().single()
  if (error) throw error
  return data as VerificationInterface
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function appendAudit(
  entity: string,
  entityId: string,
  action: string,
  payload: Record<string, unknown>,
  actor: string,
): Promise<void> {
  const { error } = await supabase
    .from('audit_log')
    .insert({ entity, entity_id: entityId, action, payload, actor, ts: new Date().toISOString() })
  if (error) throw error
}
