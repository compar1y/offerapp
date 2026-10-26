// POST /api/webhook/wiapy  (cadastre esta URL e o token na Wiapy)
// Segue a doc pública: JSON, token no header Authorization, centavos, sem campo de plano. Veja server/wiapy.ts.
//   200 = recebido e processado (inclusive duplicado/ignorado)   401 = token errado   400 = corpo ilegível
//   503 = servidor sem configuração (a Wiapy pode reenviar depois)
import { requireEnv, env } from '../../server/env.js'
import { safeEqual } from '../../server/crypto.js'
import { getKV } from '../../server/kv.js'
import { fail, json, methodNotAllowed } from '../../server/http.js'
import { applyWiapyEvent } from '../../server/purchases.js'
import { parseJsonLoose, parseWiapyPayload, redact } from '../../server/wiapy.js'

export async function POST(request: Request): Promise<Response> {
  try {
    const expected = requireEnv('WIAPY_WEBHOOK_TOKEN')
    const got = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!got || !safeEqual(got, expected)) return json({ error: 'unauthorized' }, 401)

    const raw = await request.text()
    let body: unknown
    try {
      body = parseJsonLoose(raw)
    } catch {
      return json({ error: 'JSON ilegível' }, 400)
    }
    // modo de conferência do formato real (primeira venda de teste): guarda o corpo SEM dados pessoais por 7 dias
    if (env('WEBHOOK_LOG_RAW') === '1') {
      const kv = getKV()
      await kv.push('webhook:raw', { at: new Date().toISOString(), body: redact(body) }, 30)
    }
    const result = await applyWiapyEvent(parseWiapyPayload(body))
    return json(result, result.ok ? 200 : 422)
  } catch (e) {
    return fail(e)
  }
}

export const GET = () => methodNotAllowed('POST')
