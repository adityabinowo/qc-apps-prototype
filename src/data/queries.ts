import { supabase } from '../lib/supabase'
import { coverageForLevel, levelFromPriority, riskPriority } from '../lib/rules'
import type {
  HubInterface,
  InspectionInterface,
  LevelingChangelogInterface,
  MasterLevelingInterface,
  PriorityListInterface,
  StatusChangeInterface,
  StockInterface,
  TaskInterface,
  UserInterface,
  VerificationInterface,
  WmsInventoryInterface,
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

// ── Priority list ─────────────────────────────────────────────────────────────

export async function fetchPriorityList(week?: string): Promise<PriorityListInterface[]> {
  let q = supabase.from('priority_list').select('*, master_leveling(name,category)')
  if (week) q = q.eq('week', week)
  const { data, error } = await q.order('risk_score', { ascending: false })
  if (error) throw error
  return data as unknown as PriorityListInterface[]
}

export async function insertPriorityList(rows: Omit<PriorityListInterface, 'id'>[]): Promise<void> {
  const { error } = await supabase.from('priority_list').insert(rows)
  if (error) throw error
}

export async function fetchLevelingChangelog(skuId: string): Promise<LevelingChangelogInterface[]> {
  const { data, error } = await supabase
    .from('leveling_changelog')
    .select('*')
    .eq('sku_id', skuId)
    .order('ts', { ascending: false })
  if (error) throw error
  return data as LevelingChangelogInterface[]
}

// ── Tasks (with overdue detection) ───────────────────────────────────────────

export async function fetchTasksWithOverdue(hubId?: string): Promise<(TaskInterface & { stock?: { name: string; category: string } })[]> {
  let q = supabase.from('tasks').select('*, stock(name,category)').order('deadline')
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q
  if (error) throw error
  const now = new Date()
  return ((data ?? []) as (TaskInterface & { stock?: { name: string; category: string } })[]).map(t => ({
    ...t,
    status: (t.status !== 'Done' && new Date(t.deadline) < now ? 'Overdue' : t.status) as TaskInterface['status'],
  }))
}

// ── Approvals (rich join) ─────────────────────────────────────────────────────

export async function fetchPendingApprovals(): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('status_changes')
    .select('*, inspections(nc_pct, defect_reasons, defect_desc, inspection_photos(url)), stock(name,category,sloc,soh)')
    .eq('state', 'Pending')
    .order('submitted_at')
  if (error) throw error
  return data ?? []
}

export async function approveStatusChange(id: string, skuId: string, newStatus: string, decidedBy: string): Promise<void> {
  await decideStatusChange(id, 'Approved', decidedBy)
  const { error } = await supabase.from('stock').update({ stock_status: newStatus }).eq('sku_id', skuId)
  if (error) throw error
  await appendAudit('status_changes', id, 'APPROVED', { skuId, newStatus }, decidedBy)
}

export async function rejectStatusChange(id: string, reason: string, decidedBy: string): Promise<void> {
  await decideStatusChange(id, 'Rejected', decidedBy, reason)
  await appendAudit('status_changes', id, 'REJECTED', { reason }, decidedBy)
}

export async function fetchAuditLog(): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('status_changes')
    .select('*, stock(name)')
    .in('state', ['Approved', 'Rejected'])
    .order('decided_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Completed inspections (for SPV verification) ──────────────────────────────

export async function fetchCompletedInspections(hubId?: string): Promise<unknown[]> {
  let q = supabase
    .from('inspections')
    .select('*, stock(name,category)')
    .in('lifecycle_state', ['COMPLETED', 'PENDING_SORT', 'PENDING_APPROVAL'])
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export async function fetchDashboardKpis() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [inspRes, pendRes, verifRes] = await Promise.all([
    supabase.from('inspections').select('id,lifecycle_state,hub_id,created_at,nc_pct,decision,sku_id,officer_id,sampling_qty,soh').gte('created_at', today.toISOString()),
    supabase.from('status_changes').select('id,submitted_at').eq('state', 'Pending'),
    supabase.from('verifications').select('compliance_pct,band'),
  ])
  const inspections = inspRes.data ?? []
  const pending = pendRes.data ?? []
  const verifs = verifRes.data ?? []
  const overSla = pending.filter(p => (Date.now() - new Date((p as { submitted_at: string }).submitted_at).getTime()) > 15 * 60000).length
  const avgCompliance = verifs.length > 0 ? verifs.reduce((s, v) => s + ((v as { compliance_pct: number }).compliance_pct ?? 0), 0) / verifs.length : 0
  const metCov = inspections.filter(i => (i as { nc_pct: number | null }).nc_pct !== null).length
  const covPct = inspections.length > 0 ? Math.round(metCov / inspections.length * 100) : 0
  const lifecycle: Record<string, number> = {}
  for (const i of inspections) {
    const state = (i as { lifecycle_state: string }).lifecycle_state
    lifecycle[state] = (lifecycle[state] ?? 0) + 1
  }
  return { inspectionsToday: inspections.length, pendingApprovals: pending.length, overSla, avgCompliance: Math.round(avgCompliance), covPct, lifecycle, inspections }
}

export async function fetchHubProgress(hubIds: string[]): Promise<Record<string, { pending: number; inProgress: number; done: number }>> {
  const results: Record<string, { pending: number; inProgress: number; done: number }> = {}
  await Promise.all(hubIds.map(async hub => {
    const { data } = await supabase.from('tasks').select('status').eq('hub_id', hub)
    const tasks = (data ?? []) as { status: string }[]
    results[hub] = {
      pending: tasks.filter(t => t.status === 'Pending').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      done: tasks.filter(t => t.status === 'Done').length,
    }
  }))
  return results
}

// ── Weeks ─────────────────────────────────────────────────────────────────────

export async function fetchWeeks(): Promise<string[]> {
  const { data, error } = await supabase.from('priority_list').select('week').order('week', { ascending: false })
  if (error) throw error
  return [...new Set((data ?? []).map((r: { week: string }) => r.week))]
}

// ── Priority list (replace-on-regenerate) ─────────────────────────────────────

export async function replacePriorityList(
  week: string,
  rows: Omit<PriorityListInterface, 'id'>[],
): Promise<void> {
  const { error: delErr } = await supabase.from('priority_list').delete().eq('week', week)
  if (delErr) throw delErr
  const { error } = await supabase.from('priority_list').insert(rows)
  if (error) throw error
}

// ── Leveling bulk upsert (skips manual_flag rows, logs changelog) ─────────────

export async function upsertLevelingBulk(
  rows: Pick<MasterLevelingInterface, 'sku_id' | 'name' | 'sku_number' | 'product_id' | 'category' | 'param_wastage' | 'param_inbound' | 'param_topsku' | 'param_complaint' | 'risk_score' | 'manual_flag'>[],
  actor: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('master_leveling')
    .select('sku_id, risk_score, manual_flag')
    .in('sku_id', rows.map(r => r.sku_id))

  const existingMap = new Map((existing ?? []).map((r: { sku_id: string; risk_score: number; manual_flag: boolean }) => [r.sku_id, r]))
  const now = new Date().toISOString()
  const changelogs: object[] = []

  const toUpsert = rows
    .filter(r => !existingMap.get(r.sku_id)?.manual_flag)
    .map(r => {
      const priority = riskPriority(r.risk_score)
      const level = levelFromPriority(priority)
      const coverage_pct = coverageForLevel(level)
      const prev = existingMap.get(r.sku_id)
      if (prev && prev.risk_score !== r.risk_score) {
        changelogs.push({ sku_id: r.sku_id, field: 'risk_score', old: String(prev.risk_score), new: String(r.risk_score), actor, ts: now })
      }
      return { ...r, priority, level, coverage_pct, manual_flag: false, updated_at: now, updated_by: actor }
    })

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('master_leveling').upsert(toUpsert)
    if (error) throw error
  }
  if (changelogs.length > 0) {
    const { error } = await supabase.from('leveling_changelog').insert(changelogs)
    if (error) throw error
  }
}

// ── WMS Inventory ─────────────────────────────────────────────────────────────

export async function uploadWmsInventory(
  week: string,
  hubIds: string[],
  rows: Omit<WmsInventoryInterface, 'id' | 'uploaded_at'>[],
): Promise<void> {
  for (const hubId of hubIds) {
    const { error: delErr } = await supabase.from('wms_inventory').delete().eq('week', week).eq('hub_id', hubId)
    if (delErr) throw delErr
  }
  const { error } = await supabase.from('wms_inventory').insert(rows)
  if (error) throw error
}

export async function fetchWmsInventory(week: string, hubId?: string): Promise<WmsInventoryInterface[]> {
  let q = supabase.from('wms_inventory').select('*').eq('week', week)
  if (hubId) q = q.eq('hub_id', hubId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as WmsInventoryInterface[]
}

// ── Task generation (priority list ∩ available inventory → unassigned tasks) ──

export async function generateTasks(
  week: string,
  hubIds: string[],
  actor: string,
): Promise<Record<string, number>> {
  const [{ data: priorityRows }, { data: levelingRows }] = await Promise.all([
    supabase.from('priority_list').select('sku_id, week, level, coverage_pct, priority').eq('week', week),
    supabase.from('master_leveling').select('sku_id, level, coverage_pct, priority'),
  ])

  const levelingMap = new Map((levelingRows ?? []).map((r: Pick<MasterLevelingInterface, 'sku_id' | 'level' | 'coverage_pct' | 'priority'>) => [r.sku_id, r]))
  const counts: Record<string, number> = {}

  await Promise.all(hubIds.map(async hubId => {
    const { data: inv } = await supabase
      .from('wms_inventory')
      .select('sku_id, soh_available, sloc, expiry_date')
      .eq('week', week).eq('hub_id', hubId).gt('soh_available', 0)

    const invMap = new Map((inv ?? []).map((r: Pick<WmsInventoryInterface, 'sku_id' | 'soh_available' | 'sloc' | 'expiry_date'>) => [r.sku_id, r]))
    const eligible = (priorityRows ?? []).filter((p: { sku_id: string }) => invMap.has(p.sku_id))

    const tasks = eligible.map((p: { sku_id: string }) => {
      const lev = levelingMap.get(p.sku_id)
      const invRow = invMap.get(p.sku_id)!
      const deadline = new Date(); deadline.setHours(18, 0, 0, 0)
      return {
        sku_id: p.sku_id,
        hub_id: hubId,
        officer_id: null,
        priority: lev?.priority ?? 'Low',
        level: lev?.level ?? 'LV1',
        coverage_pct: lev?.coverage_pct ?? 20,
        deadline: deadline.toISOString(),
        instructions: `sloc:${invRow.sloc ?? ''} exp:${invRow.expiry_date ?? ''}`,
        status: 'Pending' as const,
        source: 'generated' as const,
        created_by: actor,
      }
    })

    if (tasks.length > 0) {
      const { error } = await supabase.from('tasks').insert(tasks)
      if (error) throw error
    }
    counts[hubId] = tasks.length
  }))

  return counts
}

// ── Bulk task insert ──────────────────────────────────────────────────────────

export async function bulkInsertTasks(
  rows: Omit<TaskInterface, 'id' | 'created_at'>[],
): Promise<void> {
  const { error } = await supabase.from('tasks').insert(rows)
  if (error) throw error
}

// ── Bulk officer assignment ───────────────────────────────────────────────────

export async function assignOfficerBulk(taskIds: string[], officerId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ officer_id: officerId, assigned_at: new Date().toISOString() })
    .in('id', taskIds)
  if (error) throw error
}
