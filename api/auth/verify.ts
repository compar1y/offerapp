// POST /api/auth/verify  { email, code }  ->  { token }
import { hashLoginCode, safeEqual, signSession } from '../../server/crypto.js'
import { getKV } from '../../server/kv.js'
import { fail, json, methodNotAllowed, readJson } from '../../server/http.js'
import { logEvent, normEmail } from '../../server/purchases.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson<{ email?: string; code?: string }>(request)
    const email = normEmail(body?.email ?? '')
    const code = (body?.code ?? '').replace(/\D/g, '')
    const kv = getKV()
    const saved = await kv.get<{ h: string; tries: number }>(`code:${email}`)
    if (!saved || code.length !== 6) return json({ error: 'Código errado ou vencido. Peça um novo.' }, 400)
    if (saved.tries >= 5) {
      await kv.del(`code:${email}`)
      return json({ error: 'Muitas tentativas erradas. Peça um novo código.' }, 429)
    }
    if (!safeEqual(saved.h, hashLoginCode(email, code))) {
      await kv.set(`code:${email}`, { ...saved, tries: saved.tries + 1 }, 600)
      return json({ error: 'Código errado. Confira e tente de novo.' }, 400)
    }
    await kv.del(`code:${email}`)
    await logEvent({ name: 'auth.login', origin: 'app', email })
    return json({ token: signSession(email) })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
