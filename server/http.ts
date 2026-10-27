import { ConfigError, env, requireEnv } from './env.js'
import { safeEqual, verifySession } from './crypto.js'
import { normEmail } from './purchases.js'

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })

export const methodNotAllowed = (allow: string) => json({ error: 'Método não permitido.' }, 405, { allow })

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export function sessionEmail(request: Request): string | null {
  const h = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  const email = m ? verifySession(m[1]) : null
  return email ? normEmail(email) : null
}

export function isAdmin(request: Request): boolean {
  const token = requireEnv('ADMIN_TOKEN')
  const h = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  return safeEqual(h, token)
}

export const clientIp = (request: Request) => (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido'

// transforma erro de configuração em 503 claro e qualquer outro em 500 sem vazar detalhe
export function fail(e: unknown): Response {
  if (e instanceof ConfigError) {
    console.error(e.message)
    return json({ error: env('VERCEL_ENV') === 'production' ? 'Serviço ainda não configurado.' : e.message }, 503)
  }
  console.error(e)
  return json({ error: 'Erro interno. Tente de novo em instantes.' }, 500)
}
