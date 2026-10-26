// POST /api/event  { name, offerId?, itemId?, from? }  (sessão obrigatória)
// Grava eventos simples do app para medir interesse: clique numa oferta, "agora não", "fiz essa", interesse na oferta sazonal.
import { fail, json, methodNotAllowed, readJson, sessionEmail } from '../server/http.js'
import { logEvent } from '../server/purchases.js'
import { ITEM_BY_ID, isOfferId, type ItemId } from '../shared/catalog.js'

// só estes nomes são aceitos (o cliente não escolhe nomes livres)
const NAMES = ['offer.click', 'offer.dismiss', 'offer.interest', 'item.done', 'item.undone'] as const

export async function POST(request: Request): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    const b = await readJson<{ name?: string; offerId?: string; itemId?: string; from?: string }>(request)
    const name = (b?.name ?? '') as (typeof NAMES)[number]
    if (!NAMES.includes(name)) return json({ error: 'Evento desconhecido.' }, 400)
    const props: Record<string, string> = {}
    if (name.startsWith('offer.')) {
      if (!b?.offerId || !isOfferId(b.offerId)) return json({ error: 'Oferta desconhecida.' }, 400)
      props.offerId = b.offerId
    } else {
      if (!b?.itemId || !ITEM_BY_ID[b.itemId as ItemId]) return json({ error: 'Item desconhecido.' }, 400)
      props.itemId = b.itemId
    }
    if (b?.from) props.from = String(b.from).slice(0, 40)
    await logEvent({ name, origin: 'app', email, props })
    return json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
