// POST /api/auth/request-code  { email }
// Manda o código de 6 números por e-mail. Só envia se o e-mail tem alguma compra registrada, mas a resposta é sempre igual
// (não revela quem é cliente). Limites: 5 pedidos por e-mail/hora e 30 por IP/hora. Serve também para "reenviar código".
import { hashLoginCode, newLoginCode } from '../../server/crypto.js'
import { getKV } from '../../server/kv.js'
import { clientIp, fail, json, methodNotAllowed, readJson } from '../../server/http.js'
import { logEvent, normEmail, purchasesOf, validEmail } from '../../server/purchases.js'
import { sendLoginCode } from '../../server/mail.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson<{ email?: string }>(request)
    const email = normEmail(body?.email ?? '')
    if (!validEmail(email)) return json({ error: 'Confira o e-mail digitado.' }, 400)
    const kv = getKV()
    if ((await kv.incr(`rl:code:${email}`, 3600)) > 5 || (await kv.incr(`rl:ip:${clientIp(request)}`, 3600)) > 30) {
      return json({ error: 'Muitas tentativas. Espere alguns minutos.' }, 429)
    }
    if ((await purchasesOf(email)).length > 0) {
      const code = newLoginCode()
      await kv.set(`code:${email}`, { h: hashLoginCode(email, code), tries: 0 }, 600)
      await sendLoginCode(email, code)
      await logEvent({ name: 'auth.code_sent', origin: 'app', email })
    }
    return json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
