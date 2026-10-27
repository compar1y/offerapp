// POST /api/auth/request-code  { email, wait? }
// Manda o código de 6 números por e-mail. Só envia se o e-mail tem alguma compra registrada, mas a resposta é sempre igual
// (não revela quem é cliente). Limites: 5 pedidos por e-mail/hora e 30 por IP/hora. Serve também para "reenviar código".
import { hashLoginCode, newLoginCode } from '../../server/crypto.js'
import { getKV } from '../../server/kv.js'
import { clientIp, fail, json, methodNotAllowed, readJson } from '../../server/http.js'
import { logEvent, normEmail, purchasesOf, validEmail } from '../../server/purchases.js'
import { sendLoginCode } from '../../server/mail.js'

// Compra recém-feita: o webhook cria o cliente na hora, mas a tela de "compra confirmada" pode abrir antes dele chegar.
// Com wait:true a tela pergunta "já liberou?" a cada ~5 s. Só revela (ready:true) para compras dos últimos 30 minutos,
// com limite próprio por e-mail e por IP, e só então manda o código (no máximo 1 vez a cada 90 s).
const RECENT_PURCHASE_MS = 30 * 60 * 1000

async function issueCode(email: string): Promise<void> {
  const kv = getKV()
  const code = newLoginCode()
  await kv.set(`code:${email}`, { h: hashLoginCode(email, code), tries: 0 }, 600)
  await sendLoginCode(email, code)
  await logEvent({ name: 'auth.code_sent', origin: 'app', email })
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson<{ email?: string; wait?: boolean }>(request)
    const email = normEmail(body?.email ?? '')
    if (!validEmail(email)) return json({ error: 'Confira o e-mail digitado.' }, 400)
    const kv = getKV()
    if (body?.wait === true) {
      if ((await kv.incr(`rl:wait:${email}`, 3600)) > 60 || (await kv.incr(`rl:waitip:${clientIp(request)}`, 3600)) > 200) {
        return json({ error: 'Muitas tentativas. Espere alguns minutos.' }, 429)
      }
      const recent = (await purchasesOf(email)).some((p) => Date.now() - Date.parse(p.createdAt) < RECENT_PURCHASE_MS)
      if (!recent) return json({ ok: true, ready: false })
      if (!(await kv.get(`sent:${email}`))) {
        await kv.set(`sent:${email}`, 1, 90)
        await issueCode(email)
      }
      return json({ ok: true, ready: true })
    }
    if ((await kv.incr(`rl:code:${email}`, 3600)) > 5 || (await kv.incr(`rl:ip:${clientIp(request)}`, 3600)) > 30) {
      return json({ error: 'Muitas tentativas. Espere alguns minutos.' }, 429)
    }
    if ((await purchasesOf(email)).length > 0) {
      await issueCode(email)
    }
    return json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
