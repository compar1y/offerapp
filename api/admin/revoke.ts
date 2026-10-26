// POST /api/admin/revoke  (Bearer <ADMIN_TOKEN>)  { email, orderId? }
// Encerra o acesso (reembolso feito por fora). Sem orderId, encerra todas as compras pagas do e-mail.
import { fail, isAdmin, json, methodNotAllowed, readJson } from '../../server/http.js'
import { revokeManual } from '../../server/purchases.js'

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAdmin(request)) return json({ error: 'unauthorized' }, 401)
    const b = await readJson<{ email?: string; orderId?: string }>(request)
    if (!b?.email) return json({ error: 'informe email' }, 400)
    return json({ ok: true, revoked: await revokeManual(b.email, b.orderId) })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
