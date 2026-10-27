// Lê o MESMO public/checkouts.json que o app (campo ready de cada id) para resolver os direitos de combo/coleção na leitura (/api/me).
// CHECKOUTS_FILE troca o caminho (opcional). O resultado fica em memória por CHECKOUTS_CACHE_MS (padrão 30 s; 0 = sempre relê).
// Arquivo ausente ou inválido = nada pronto (os itens de combo/coleção só entram quando o arquivo disser ready:true).
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCheckouts, readyIdsOf, type CheckoutMap } from '../shared/catalog.js'
import { env } from './env.js'

let cache: { at: number; map: CheckoutMap } | null = null

export async function loadCheckouts(): Promise<CheckoutMap> {
  const ttl = Number(env('CHECKOUTS_CACHE_MS') || 30000)
  if (cache && Date.now() - cache.at < ttl) return cache.map
  let map: CheckoutMap = {}
  try {
    const file = env('CHECKOUTS_FILE') || join(process.cwd(), 'public', 'checkouts.json')
    map = parseCheckouts(JSON.parse(await readFile(file, 'utf8')))
  } catch {
    map = {}
  }
  cache = { at: Date.now(), map }
  return map
}

export const readyIds = async (): Promise<ReadonlySet<string>> => readyIdsOf(await loadCheckouts())
