import { ConfigFaltando } from './env.js'

export function json(dados: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })
}

export function falha(e: unknown): Response {
  if (e instanceof ConfigFaltando) {
    console.error(e.message)
    return json({ erro: 'O servidor ainda não está configurado.' }, 503)
  }
  console.error(e)
  return json({ erro: 'Algo deu errado. Tente de novo em instantes.' }, 500)
}

export async function corpoJson(req: Request, limite = 64_000): Promise<unknown> {
  const t = await req.text()
  if (t.length > limite) throw new Error('corpo grande demais')
  return t ? JSON.parse(t) : {}
}

export const normalizarEmail = (s: unknown): string => (typeof s === 'string' ? s.trim().toLowerCase() : '')
export const emailValido = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254
