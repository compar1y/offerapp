// GET /api/me  (Authorization: Bearer <token>)  ->  MeResponse (e-mail, plano, itens liberados, compras com status)
import { fail, json, methodNotAllowed, sessionEmail } from '../server/http.js'
import { meFor } from '../server/purchases.js'

export async function GET(request: Request): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    return json(await meFor(email))
  } catch (e) {
    return fail(e)
  }
}

export const POST = () => methodNotAllowed('GET')
