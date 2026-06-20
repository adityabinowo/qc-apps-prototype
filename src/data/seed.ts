import { supabase } from '../lib/supabase'

/** Idempotent seed — inserts only when the table is empty. */
export async function seed(): Promise<void> {
  // Hubs
  const { count: hubCount } = await supabase.from('hubs').select('*', { count: 'exact', head: true })
  if (!hubCount) {
    await supabase.from('hubs').insert([
      { id: 'hub-kemang', name: 'Hub Kemang', location: 'South Jakarta' },
      { id: 'hub-tebet', name: 'Hub Tebet', location: 'South Jakarta' },
      { id: 'hub-pancoran', name: 'Hub Pancoran', location: 'South Jakarta' },
    ])
  }

  // Users
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
  if (!userCount) {
    await supabase.from('users').insert([
      { id: 'user-spv-1', name: 'Rina N', email: 'spv.quality@astronauts.id', role: 'spv', hub_id: 'hub-kemang' },
      { id: 'user-px-1', name: 'Budi K', email: 'px.quality@astronauts.id', role: 'px', hub_id: 'hub-kemang' },
      { id: 'user-officer-1', name: 'Dani A', email: 'officer1@astronauts.id', role: 'officer', hub_id: 'hub-kemang' },
      { id: 'user-officer-2', name: 'Sari W', email: 'officer2@astronauts.id', role: 'officer', hub_id: 'hub-tebet' },
    ])
  }

  // Stock (mock WIMS)
  const { count: stockCount } = await supabase.from('stock').select('*', { count: 'exact', head: true })
  if (!stockCount) {
    await supabase.from('stock').insert([
      { sku_id: 'SKU-001', name: 'Ayam Karkas 1kg', product_id: 'P001', category: 'Fresh', sloc: 'SLOC-A1', soh: 240, msltc: 5, last_ed: '2026-06-25', stock_status: 'Available' },
      { sku_id: 'SKU-002', name: 'Daging Sapi Slice', product_id: 'P002', category: 'Fresh', sloc: 'SLOC-A2', soh: 180, msltc: 4, last_ed: '2026-06-24', stock_status: 'Available' },
      { sku_id: 'SKU-003', name: 'Ikan Nila Fillet', product_id: 'P003', category: 'Fresh', sloc: 'SLOC-B1', soh: 310, msltc: 3, last_ed: '2026-06-23', stock_status: 'Available' },
      { sku_id: 'SKU-004', name: 'Nugget Ayam 500g', product_id: 'P004', category: 'Frozen', sloc: 'SLOC-C1', soh: 420, msltc: 90, last_ed: '2026-09-01', stock_status: 'Available' },
      { sku_id: 'SKU-005', name: 'Sosis Sapi 200g', product_id: 'P005', category: 'Frozen', sloc: 'SLOC-C2', soh: 380, msltc: 60, last_ed: '2026-08-15', stock_status: 'Available' },
      { sku_id: 'SKU-006', name: 'Beras Premium 5kg', product_id: 'P006', category: 'Dry', sloc: 'SLOC-D1', soh: 150, msltc: 365, last_ed: '2027-06-20', stock_status: 'Available' },
      { sku_id: 'SKU-007', name: 'Minyak Goreng 2L', product_id: 'P007', category: 'Dry', sloc: 'SLOC-D2', soh: 200, msltc: 540, last_ed: '2027-11-01', stock_status: 'Available' },
      { sku_id: 'SKU-008', name: 'Tempe Organik 300g', product_id: 'P008', category: 'Fresh', sloc: 'SLOC-A3', soh: 90, msltc: 5, last_ed: '2026-06-22', stock_status: 'Bad' },
      { sku_id: 'SKU-009', name: 'Tahu Sutra 400g', product_id: 'P009', category: 'Fresh', sloc: 'SLOC-A4', soh: 120, msltc: 7, last_ed: '2026-06-23', stock_status: 'Available' },
      { sku_id: 'SKU-010', name: 'Udang Vannamei 500g', product_id: 'P010', category: 'Frozen', sloc: 'SLOC-C3', soh: 210, msltc: 180, last_ed: '2026-12-01', stock_status: 'Available' },
    ])
  }

  // Master Leveling
  const { count: mlCount } = await supabase.from('master_leveling').select('*', { count: 'exact', head: true })
  if (!mlCount) {
    const ts = new Date().toISOString()
    await supabase.from('master_leveling').insert([
      { sku_id: 'SKU-001', name: 'Ayam Karkas 1kg', product_id: 'P001', category: 'Fresh', risk_score: 6, priority: 'High', level: 'LV3', coverage_pct: 70, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-002', name: 'Daging Sapi Slice', product_id: 'P002', category: 'Fresh', risk_score: 5, priority: 'High', level: 'LV3', coverage_pct: 70, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-003', name: 'Ikan Nila Fillet', product_id: 'P003', category: 'Fresh', risk_score: 4, priority: 'Medium', level: 'LV2', coverage_pct: 50, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-004', name: 'Nugget Ayam 500g', product_id: 'P004', category: 'Frozen', risk_score: 3, priority: 'Medium', level: 'LV2', coverage_pct: 50, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-005', name: 'Sosis Sapi 200g', product_id: 'P005', category: 'Frozen', risk_score: 3, priority: 'Medium', level: 'LV2', coverage_pct: 50, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-006', name: 'Beras Premium 5kg', product_id: 'P006', category: 'Dry', risk_score: 2, priority: 'Low', level: 'LV1', coverage_pct: 20, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-007', name: 'Minyak Goreng 2L', product_id: 'P007', category: 'Dry', risk_score: 1, priority: 'Low', level: 'LV1', coverage_pct: 20, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-008', name: 'Tempe Organik 300g', product_id: 'P008', category: 'Fresh', risk_score: 5, priority: 'High', level: 'LV3', coverage_pct: 70, manual_flag: true, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-009', name: 'Tahu Sutra 400g', product_id: 'P009', category: 'Fresh', risk_score: 3, priority: 'Medium', level: 'LV2', coverage_pct: 50, manual_flag: false, updated_at: ts, updated_by: 'seed' },
      { sku_id: 'SKU-010', name: 'Udang Vannamei 500g', product_id: 'P010', category: 'Frozen', risk_score: 6, priority: 'High', level: 'LV3', coverage_pct: 70, manual_flag: false, updated_at: ts, updated_by: 'seed' },
    ])
  }
}
