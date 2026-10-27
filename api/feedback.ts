// POST /api/feedback  { choice, text }  ->  salva o evento "feedback.dificuldade" (mini-formulário "qual sua maior dificuldade agora?")
import { fail, json, methodNotAllowed, readJson, sessionEmail } from '../server/http.js'
import { logEvent } from '../server/purchases.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)
    const b = await readJson<{ choice?: string; text?: string }>(request)
    const choice = (b?.choice ?? '').trim().slice(0, 80)
    if (!choice) return json({ error: 'Escolha uma opção.' }, 400)
    await logEvent({ name: 'feedback.dificuldade', origin: 'app', email, props: { choice, text: (b?.text ?? '').trim().slice(0, 280) } })
    return json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
