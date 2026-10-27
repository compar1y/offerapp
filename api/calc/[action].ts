// Conta da Fornada: uma função só (limite de 12 funções da Vercel Hobby). Sempre com sessão (Authorization: Bearer <token>).
//   POST /api/calc/round   { recipe, contaId, swap? }   rodada grátis contada no servidor (kv.incr). Só sessão (não exige a compra).
//   GET  /api/calc/sync    -> { doc }                    cópia da conta guardada. Exige a ferramenta liberada (direito `calculadora`).
//   PUT  /api/calc/sync    { doc }                       manda o documento do aparelho; o servidor mescla (mais recente vence, item por item) e devolve o resultado.
//   GET  /api/calc/export  -> arquivo JSON com a cópia guardada na conta. Só sessão: a cliente leva os dados mesmo depois de um estorno.
//   POST /api/calc/delete  apaga a cópia guardada na conta (o aparelho é apagado pelo app). Só sessão.
import { fail, json, methodNotAllowed, readJson, sessionEmail } from '../../server/http.js'
import { deleteDoc, hasTool, rateLimited, readDoc, saveDoc, startRound } from '../../server/calc.js'

const actionOf = (request: Request): string => new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop() ?? ''
const MAX_BODY = 900 * 1024

async function handle(request: Request): Promise<Response> {
  try {
    const action = actionOf(request)
    const method = request.method
    const allowed: Record<string, string[]> = { round: ['POST'], sync: ['GET', 'PUT'], export: ['GET'], delete: ['POST'] }
    if (!allowed[action]) return json({ error: 'rota não encontrada' }, 404)
    if (!allowed[action].includes(method)) return methodNotAllowed(allowed[action].join(', '))
    const email = sessionEmail(request)
    if (!email) return json({ error: 'Sessão inválida.' }, 401)

    if (action === 'round') {
      const b = await readJson<{ recipe?: unknown; contaId?: unknown; swap?: unknown }>(request)
      if (!b) return json({ error: 'corpo inválido' }, 400)
      const r = await startRound(email, b)
      return r.ok ? json(r) : json({ error: r.error, info: r.info ?? null }, r.status)
    }
    if (action === 'delete') {
      await deleteDoc(email)
      return json({ ok: true })
    }
    if (action === 'export') {
      const doc = await readDoc(email)
      return json({ app: 'conta-da-fornada', exportadoEm: new Date().toISOString(), doc }, 200, { 'content-disposition': 'attachment; filename="conta-da-fornada.json"' })
    }
    // sync
    if (!(await hasTool(email))) return json({ error: 'Esta função faz parte da Conta da Fornada completa.', code: 'sem_acesso' }, 403)
    if (await rateLimited(email)) return json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, 429)
    if (method === 'GET') return json({ ok: true, doc: await readDoc(email) })
    const len = Number(request.headers.get('content-length') ?? 0)
    if (len > MAX_BODY) return json({ error: 'Seus dados passaram do tamanho permitido para guardar na conta.' }, 413)
    const text = await request.text()
    if (text.length > MAX_BODY) return json({ error: 'Seus dados passaram do tamanho permitido para guardar na conta.' }, 413)
    let body: { doc?: unknown } | null = null
    try {
      body = JSON.parse(text) as { doc?: unknown }
    } catch {
      body = null
    }
    if (!body || typeof body !== 'object') return json({ error: 'corpo inválido' }, 400)
    const r = await saveDoc(email, body.doc)
    return r.ok ? json({ ok: true, doc: r.doc }) : json({ error: r.error }, r.status)
  } catch (e) {
    return fail(e)
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
