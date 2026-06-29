import { supabase } from '../lib/supabase'
import { coverageForLevel, levelFromPriority, riskPriority } from '../lib/rules'
import type {
  HubInterface,
  InspectionInterface,
  LevelingChangelogInterface,
  LevelType,
  MasterLevelingInterface,
  PriorityListInterface,
  PriorityType,
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

export async function fetchMasterLevelingPaged({
  page = 0,
  pageSize = 50,
  search = '',
  category = '',
  level = '',
  priority = '',
}: {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  level?: string
  priority?: string
} = {}): Promise<{ rows: MasterLevelingInterface[]; total: number }> {
  let q = supabase.from('master_leveling').select('*', { count: 'exact' })
  if (search) q = q.or(`name.ilike.%${search}%,sku_id.ilike.%${search}%,product_id.ilike.%${search}%`)
  if (category) q = q.eq('category', category)
  if (level) q = q.eq('level', level)
  if (priority) q = q.eq('priority', priority)
  q = q.order('name').range(page * pageSize, (page + 1) * pageSize - 1)
  const { data, count, error } = await q
  if (error) throw error
  return { rows: (data ?? []) as MasterLevelingInterface[], total: count ?? 0 }
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

export async function fetchPriorityList(): Promise<PriorityListInterface[]> {
  const { data, error } = await supabase
    .from('priority_list')
    .select('*, master_leveling(name,category)')
    .order('risk_score', { ascending: false })
  if (error) throw error
  return data as unknown as PriorityListInterface[]
}

export async function fetchPriorityListPaged({ page = 0, pageSize = 50 } = {}): Promise<{ rows: PriorityListInterface[]; total: number }> {
  const { data, count, error } = await supabase
    .from('priority_list')
    .select('*, master_leveling(name,category)', { count: 'exact' })
    .order('risk_score', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { rows: (data ?? []) as unknown as PriorityListInterface[], total: count ?? 0 }
}

export async function fetchPriorityListSummary(): Promise<{ total: number; high: number; medium: number; low: number; uploadedAt: string | null }> {
  const [
    { count: total },
    { count: high },
    { count: medium },
    { count: low },
    { data: sample },
  ] = await Promise.all([
    supabase.from('priority_list').select('*', { count: 'exact', head: true }),
    supabase.from('priority_list').select('*', { count: 'exact', head: true }).eq('priority', 'High'),
    supabase.from('priority_list').select('*', { count: 'exact', head: true }).eq('priority', 'Medium'),
    supabase.from('priority_list').select('*', { count: 'exact', head: true }).eq('priority', 'Low'),
    supabase.from('priority_list').select('generated_at').order('generated_at', { ascending: false }).limit(1),
  ])
  return {
    total: total ?? 0,
    high: high ?? 0,
    medium: medium ?? 0,
    low: low ?? 0,
    uploadedAt: (sample as { generated_at: string }[] | null)?.[0]?.generated_at ?? null,
  }
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
  const verificationBands: Record<string, number> = {}
  for (const v of verifs) {
    const band = (v as { band?: string }).band
    if (band) verificationBands[band] = (verificationBands[band] ?? 0) + 1
  }
  return { inspectionsToday: inspections.length, pendingApprovals: pending.length, overSla, avgCompliance: Math.round(avgCompliance), covPct, lifecycle, verificationBands, inspections }
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

// ── Chunk helper (PostgREST URL limit ~2000 chars; safe batch = 200 for .in, 500 for insert) ──
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Priority list (targeted replace — only uploaded sku_ids are touched) ──────

export async function replacePriorityList(
  rows: Omit<PriorityListInterface, 'id'>[],
): Promise<void> {
  const skuIds = rows.map(r => r.sku_id)
  // Delete only the sku_ids being uploaded; all other rows remain untouched
  for (const batch of chunkArray(skuIds, 200)) {
    const { error } = await supabase.from('priority_list').delete().in('sku_id', batch)
    if (error) throw error
  }
  for (const batch of chunkArray(rows, 500)) {
    const { error } = await supabase.from('priority_list').insert(batch)
    if (error) throw error
  }
}

// ── Leveling bulk upsert (skips manual_flag rows, logs changelog) ─────────────

export async function upsertLevelingBulk(
  rows: Pick<MasterLevelingInterface, 'sku_id' | 'name' | 'sku_number' | 'product_id' | 'category' | 'param_wastage' | 'param_inbound' | 'param_topsku' | 'param_complaint' | 'risk_score' | 'manual_flag'>[],
  actor: string,
): Promise<void> {
  // Fetch existing in chunks to stay within PostgREST URL limits
  const existingAll: { sku_id: string; risk_score: number; manual_flag: boolean }[] = []
  for (const batch of chunkArray(rows.map(r => r.sku_id), 200)) {
    const { data } = await supabase
      .from('master_leveling')
      .select('sku_id, risk_score, manual_flag')
      .in('sku_id', batch)
    if (data) existingAll.push(...(data as typeof existingAll))
  }

  const existingMap = new Map(existingAll.map(r => [r.sku_id, r]))
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

  for (const batch of chunkArray(toUpsert, 500)) {
    const { error } = await supabase.from('master_leveling').upsert(batch)
    if (error) throw error
  }
  if (changelogs.length > 0) {
    for (const batch of chunkArray(changelogs, 500)) {
      const { error } = await supabase.from('leveling_changelog').insert(batch)
      if (error) throw error
    }
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
  for (const batch of chunkArray(rows, 500)) {
    const { error } = await supabase.from('wms_inventory').insert(batch)
    if (error) throw error
  }
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
  priorities: PriorityType[] = ['High', 'Medium', 'Low'],
): Promise<Record<string, number>> {
  // Fetch ALL priority SKUs — no week filter, paginate past the 1000-row cap
  const priorityAll: { sku_id: string; level: LevelType; priority: PriorityType }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('priority_list').select('sku_id, level, priority').range(from, from + 999)
    if (error) throw error
    priorityAll.push(...(data ?? []) as any)
    if (!data || data.length < 1000) break
  }
  const pMap = new Map(
    priorityAll
      .filter(p => priorities.includes(p.priority))
      .map(p => [p.sku_id, p])
  )

  const counts: Record<string, number> = {}

  // Run hubs sequentially to avoid race on shared task table
  for (const hubId of hubIds) {
    // Clear existing generated tasks for this hub so re-runs don't hit duplicate keys
    const { error: delErr } = await supabase
      .from('tasks').delete().eq('hub_id', hubId).eq('source', 'generated')
    if (delErr) throw delErr

    // Paginate inventory per hub past 1000
    const inv: { sku_id: string; soh_available: number; sloc: string | null; expiry_date: string | null }[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('wms_inventory').select('sku_id, soh_available, sloc, expiry_date')
        .eq('week', week).eq('hub_id', hubId).gt('soh_available', 0)
        .range(from, from + 999)
      if (error) throw error
      inv.push(...(data ?? []) as any)
      if (!data || data.length < 1000) break
    }

    // Dedupe by sku_id, intersect with priority map
    const seen = new Set<string>()
    const tasks = inv
      .filter(r => pMap.has(r.sku_id) && !seen.has(r.sku_id) && seen.add(r.sku_id))
      .map(r => {
        const p = pMap.get(r.sku_id)!
        const level = (p.level ?? 'LV1') as LevelType
        const deadline = new Date(); deadline.setHours(18, 0, 0, 0)
        return {
          sku_id: r.sku_id, hub_id: hubId, officer_id: null,
          priority: p.priority ?? 'Low', level, coverage_pct: coverageForLevel(level),
          deadline: deadline.toISOString(),
          instructions: `sloc:${r.sloc ?? ''} exp:${r.expiry_date ?? ''}`,
          status: 'Pending' as const, source: 'generated' as const, created_by: actor,
        }
      })

    for (const batch of chunkArray(tasks, 500)) {
      const { error } = await supabase.from('tasks').insert(batch)
      if (error) throw error
    }
    counts[hubId] = tasks.length
  }

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
