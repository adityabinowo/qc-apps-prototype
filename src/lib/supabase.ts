import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  // Surface a clear error at boot rather than a cryptic network failure later
  console.warn('[supabase] Missing env vars — copy .env.example to .env and fill in your Supabase project URL and anon key')
}

export const supabase = createClient(url ?? '', key ?? '')
