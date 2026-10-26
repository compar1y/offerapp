// GET /api/file/<storageKey>[?dl=1]  (Bearer)  ->  { url }  URL temporária assinada (HMAC, vale poucos minutos)
// Só devolve se a compra paga do usuário libera o item. O arquivo em si sai em /api/dl/<key>.
import { findFile } from '../../shared/catalog.js'
import { signFileUrl, userTag } from '../../server/crypto.js'
import { env } from '../../server/env.js'
import { fail, json, methodNotAllowed, sessionEmail } from '../../server/http.js'
import { logEvent, meFor } from '../../server/purchases.js'

export async function GET(request: Request): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    const url = new URL(request.url)
    const key = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    const hit = findFile(key)
    if (!hit) return json({ error: 'Arquivo não encontrado.' }, 404)
    const me = await meFor(email)
    if (!me.items.includes(hit.item.id)) return json({ error: 'Este material não está liberado no seu acesso.' }, 403)
    const ttl = Math.min(Math.max(Number(env('FILE_URL_TTL_SEC')) || 300, 30), 1800)
    const dl = url.searchParams.get('dl') === '1'
    const signed = signFileUrl({ key, exp: Math.floor(Date.now() / 1000) + ttl, dl, uid: userTag(email) })
    await logEvent({ name: dl ? 'file.download' : 'file.open', origin: 'app', email, props: { key } })
    return json({ url: signed })
  } catch (e) {
    return fail(e)
  }
}

export const POST = () => methodNotAllowed('GET')
