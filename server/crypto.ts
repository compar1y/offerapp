import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { requireEnv } from './env.js'

export const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')

export function hmac(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

// ---- sessão: token sem estado "payload.assinatura" (HMAC-SHA256 com SESSION_SECRET)
export interface SessionPayload {
  sub: string // e-mail
  exp: number // epoch em segundos
}

export function signSession(email: string, ttlSec = 60 * 60 * 24 * 30, now = Date.now()): string {
  const payload = b64url(JSON.stringify({ sub: email, exp: Math.floor(now / 1000) + ttlSec } satisfies SessionPayload))
  return `${payload}.${hmac(requireEnv('SESSION_SECRET'), payload)}`
}

export function verifySession(token: string, now = Date.now()): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  if (!safeEqual(sig, hmac(requireEnv('SESSION_SECRET'), payload))) return null
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload
    if (typeof p.sub !== 'string' || typeof p.exp !== 'number' || p.exp * 1000 < now) return null
    return p.sub
  } catch {
    return null
  }
}

// ---- código de login (6 números). No KV fica só o hash.
export const newLoginCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
export const hashLoginCode = (email: string, code: string) => hmac(requireEnv('SESSION_SECRET'), `code|${email}|${code}`)

// ---- URL temporária de arquivo (HMAC com FILE_SIGNING_SECRET)
export interface SignedFile {
  key: string
  exp: number // epoch em segundos
  dl: boolean
  uid: string
}

const fileData = (f: SignedFile) => `${f.key}|${f.exp}|${f.dl ? 1 : 0}|${f.uid}`

export const userTag = (email: string) => hmac(requireEnv('SESSION_SECRET'), `uid|${email}`).slice(0, 12)

export function signFileUrl(f: SignedFile): string {
  const q = new URLSearchParams({ e: String(f.exp), d: f.dl ? '1' : '0', u: f.uid, s: hmac(requireEnv('FILE_SIGNING_SECRET'), fileData(f)) })
  return `/api/dl/${encodeURIComponent(f.key)}?${q}`
}

export function verifyFileUrl(key: string, query: URLSearchParams, now = Date.now()): SignedFile | null {
  const f: SignedFile = { key, exp: Number(query.get('e')), dl: query.get('d') === '1', uid: query.get('u') ?? '' }
  const sig = query.get('s') ?? ''
  if (!Number.isFinite(f.exp) || f.exp * 1000 < now || !sig) return null
  return safeEqual(sig, hmac(requireEnv('FILE_SIGNING_SECRET'), fileData(f))) ? f : null
}
