// POST /api/sair
import { json } from '../server/http.js'
import { cookieSair } from '../server/sessao.js'

export function POST(): Response {
  return json({ ok: true }, 200, { 'set-cookie': cookieSair })
}
