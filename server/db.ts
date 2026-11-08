// Supabase com a chave de serviço (só no servidor). Tabelas em supabase/schema.sql.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { exigir } from './env.js'

let cliente: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(exigir('SUPABASE_URL'), exigir('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cliente
}

export const BUCKET = 'paginas'
