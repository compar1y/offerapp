// GET /api/admin/events?limit=200&name=feedback.dificuldade  (Bearer <ADMIN_TOKEN>)  -> últimos eventos (compras, acessos, respostas do formulário)
import { getKV } from '../../server/kv.js'
import { fail, isAdmin, json, methodNotAllowed } from '../../server/http.js'
import type { AppEvent } from '../../server/purchases.js'

export async function GET(request: Request): Promise<Response> {
  try {
    if (!isAdmin(request)) return json({ error: 'unauthorized' }, 401)
    const u = new URL(request.url)
    const limit = Math.min(Number(u.searchParams.get('limit')) || 200, 2000)
    const name = u.searchParams.get('name')
    const all = await getKV().list<AppEvent>('events', 5000)
    return json((name ? all.filter((e) => e.name === name || e.name.startsWith(`${name}.`)) : all).slice(-limit))
  } catch (e) {
    return fail(e)
  }
}

export const POST = () => methodNotAllowed('GET')
