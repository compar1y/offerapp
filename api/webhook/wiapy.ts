// POST /api/webhook/wiapy  (cadastrar esta URL na Wiapy, com o token no header Authorization)
// 200 = recebido (inclusive ignorado) · 401 = token errado · 400 = corpo ilegível · 503 = servidor sem configuração
import { db } from '../../server/db.js'
import { env, exigir } from '../../server/env.js'
import { falha, json } from '../../server/http.js'
import { iguais } from '../../server/sessao.js'
import { lerJsonTolerante, lerPedido, semDadosPessoais } from '../../server/wiapy.js'

export async function POST(req: Request): Promise<Response> {
  try {
    const esperado = exigir('WIAPY_WEBHOOK_TOKEN')
    const veio = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!veio || !iguais(veio, esperado)) return json({ erro: 'token inválido' }, 401)
    let corpo: unknown
    try {
      corpo = lerJsonTolerante(await req.text())
    } catch {
      return json({ erro: 'JSON ilegível' }, 400)
    }
    if (env('WEBHOOK_GUARDAR_BRUTO') === '1') await db().from('webhook_bruto').insert({ corpo: semDadosPessoais(corpo) })

    const p = lerPedido(corpo)
    if (p.tipo !== 'pagamento') return json({ ok: true, ignorado: p.tipo })
    if (!p.email || !p.status) {
      await db().from('eventos').insert({ email: p.email || null, tipo: 'webhook.ignorado', dados: { motivo: 'sem e-mail ou status desconhecido', status: p.statusBruto, checkout: p.checkoutId } })
      return json({ ok: true, ignorado: 'sem e-mail ou status' })
    }
    if (!p.produtos.length) {
      await db().from('eventos').insert({ email: p.email, tipo: 'webhook.ignorado', dados: { motivo: 'checkout desconhecido', checkout: p.checkoutId } })
      return json({ ok: true, ignorado: 'checkout desconhecido' })
    }
    const pagamentoId = p.pagamentoId || `${p.checkoutId}:${p.email}`
    const linhas = p.produtos.map((produto) => ({
      email: p.email,
      produto,
      status: p.status,
      pagamento_id: pagamentoId,
      checkout_id: p.checkoutId,
      valor_centavos: p.valorCentavos,
      metodo: p.metodo,
      atualizado_em: new Date().toISOString(),
    }))
    const { error } = await db().from('compras').upsert(linhas, { onConflict: 'pagamento_id,produto' })
    if (error) throw error
    return json({ ok: true, produtos: p.produtos, status: p.status })
  } catch (e) {
    return falha(e)
  }
}
