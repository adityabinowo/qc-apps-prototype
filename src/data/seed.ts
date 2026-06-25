import { supabase } from '../lib/supabase'

/** Idempotent seed — inserts hubs and users only when tables are empty.
 *  stock + master_leveling are seeded via supabase/seed_leveling.sql (SQL import). */
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
}
