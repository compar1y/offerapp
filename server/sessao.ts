// Sessão por cookie assinado (HMAC-SHA256). Login só com o e-mail da compra (decisão do Levi em 08/11/2026).
import { createHmac, timingSafeEqual } from 'node:crypto'
import { exigir } from './env.js'

const COOKIE = 'fornada'
const DIAS = 90

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const de64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function assinar(dado: string, segredo: string): string {
  return createHmac('sha256', segredo).update(dado).digest('base64url')
}

export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function criarToken(email: string, agora = Date.now(), segredo = exigir('SESSION_SECRET')): string {
  const dado = b64(JSON.stringify({ e: email, x: agora + DIAS * 864e5 }))
  return `${dado}.${assinar(dado, segredo)}`
}

export function lerToken(token: string, agora = Date.now(), segredo = exigir('SESSION_SECRET')): string | null {
  const [dado, sig] = token.split('.')
  if (!dado || !sig || !iguais(sig, assinar(dado, segredo))) return null
  try {
    const { e, x } = JSON.parse(de64(dado)) as { e: string; x: number }
    return typeof e === 'string' && typeof x === 'number' && x > agora ? e : null
  } catch {
    return null
  }
}

export function cookieDeSessao(email: string): string {
  return `${COOKIE}=${criarToken(email)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS * 86400}`
}

export const cookieSair = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export function emailDaSessao(req: Request): string | null {
  const c = req.headers.get('cookie') ?? ''
  const m = c.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  return m ? lerToken(m[1]) : null
}
