// POST /api/event  { name, offerId?, itemId?, from? }  (sessão obrigatória)
// Eventos do sistema de catálogo: journey.view, hook.click, (sem coleções).
// Grava eventos simples do app para medir interesse: clique numa oferta, "agora não", "fiz essa", interesse na oferta sazonal.
import { fail, json, methodNotAllowed, readJson, sessionEmail } from '../server/http.js'
import { logEvent } from '../server/purchases.js'
import { ITEM_BY_ID, isOfferId, type ItemId } from '../shared/catalog.js'

// só estes nomes são aceitos (o cliente não escolhe nomes livres)
const NAMES = ['offer.click', 'offer.dismiss', 'offer.interest', 'offer.view', 'catalog.view', 'combo.view', 'combo.spin', 'combo.click', 'combo.interest', 'journey.view', 'hook.click', 'item.done', 'item.undone'] as const

export async function POST(request: Request): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    const b = await readJson<{ name?: string; offerId?: string; itemId?: string; from?: string; count?: number; to?: string }>(request)
    const name = (b?.name ?? '') as (typeof NAMES)[number]
    if (!NAMES.includes(name)) return json({ error: 'Evento desconhecido.' }, 400)
    const props: Record<string, string> = {}
    if (name.startsWith('offer.')) {
      if (!b?.offerId || !(isOfferId(b.offerId) || b.offerId === 'bump')) return json({ error: 'Oferta desconhecida.' }, 400)
      props.offerId = b.offerId
    } else if (name === 'hook.click') {
      // gancho "depois de X, o próximo passo é Y": itemId = o produto onde estava, to = a oferta para onde foi
      if (!b?.itemId || !ITEM_BY_ID[b.itemId as ItemId] || !isOfferId(b.to)) return json({ error: 'Gancho desconhecido.' }, 400)
      props.itemId = b.itemId
      props.to = b.to
    } else if (name === 'journey.view') {
      // mapa "Seu caminho": só conta a abertura (e quantos itens a cliente já tem)
      const c = Number(b?.count)
      if (Number.isFinite(c)) props.count = String(Math.max(0, Math.min(99, Math.trunc(c))))
    } else if (name.startsWith('combo.')) {
      // sem oferta nem item: só registra a ação no combo "Leve tudo" (e de onde veio)
    } else if (name === 'catalog.view') {
      // sem oferta nem item: só conta a abertura do catálogo (props numéricas curtas)
      const c = Number((b as { count?: unknown })?.count)
      if (Number.isFinite(c)) props.count = String(Math.max(0, Math.min(99, Math.trunc(c))))
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
