// POST /api/admin/grant  (Authorization: Bearer <ADMIN_TOKEN>)  { email, plan?, bump?, offers?: [ids], bundles?: ['combo'], note? }
// Libera acesso manualmente (cliente que comprou fora, suporte, cortesia). Fica registrado como compra "manual".
import { PLANS, isBundleId, isOfferId, type PlanId } from '../../shared/catalog.js'
import { fail, isAdmin, json, methodNotAllowed, readJson } from '../../server/http.js'
import { grantManual, normEmail, validEmail } from '../../server/purchases.js'

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAdmin(request)) return json({ error: 'unauthorized' }, 401)
    const b = await readJson<{ email?: string; plan?: string; bump?: boolean; offers?: string[]; bundles?: string[]; note?: string }>(request)
    if (!b) return json({ error: 'corpo inválido' }, 400)
    const email = normEmail(b.email ?? '')
    if (!validEmail(email)) return json({ error: 'e-mail inválido' }, 400)
    if (b?.plan && !(b.plan in PLANS)) return json({ error: `plano inválido. Use: ${Object.keys(PLANS).join(', ')}` }, 400)
    const offers = (b?.offers ?? []).filter(isOfferId)
    if ((b?.offers ?? []).length !== offers.length) return json({ error: 'oferta inválida em offers' }, 400)
    const bundles = (b?.bundles ?? []).filter(isBundleId)
    if ((b?.bundles ?? []).length !== bundles.length) return json({ error: "bundle inválido em bundles (só 'combo')" }, 400)
    if (!b?.plan && !b?.bump && !offers.length && !bundles.length) return json({ error: 'informe plan, bump, offers ou bundles' }, 400)
    const p = await grantManual({ email, plan: (b.plan as PlanId | undefined) ?? null, bump: b.bump, offers, bundles, source: 'manual', note: b.note })
    return json({ ok: true, orderId: p.orderId })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
