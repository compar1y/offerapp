// POST /api/webhook/wiapy  (cadastrar esta URL na Wiapy, com o token no header Authorization)
// 200 = recebido (inclusive ignorado) · 401 = token errado · 400 = corpo ilegível · 503 = servidor sem configuração
import { db } from '../../server/db.js'
import { env, exigir } from '../../server/env.js'
import { falha, json } from '../../server/http.js'
import { iguais } from '../../server/sessao.js'
import { lerJsonTolerante, lerPedido, pagoEmDe, semColunaPagoEm, semDadosPessoais } from '../../server/wiapy.js'
import { emailLigado, enviarEmailAcesso } from '../../server/email.js'

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
    const recebidoEm = new Date()
    // linhas que já existem deste pagamento: e-mail só na primeira vez que vira "pago" (a Wiapy reenvia o mesmo aviso)
    // e pago_em já gravado não muda (o prazo de 3 h não reabre num reenvio)
    let jaEstavaPago = false
    const pagoEmGravado = new Map<string, string>()
    let temColunaPagoEm = true
    if (p.status === 'pago') {
      let r: { data: unknown[] | null; error: { code?: string; message?: string } | null } = await db().from('compras').select('produto,status,pago_em').eq('pagamento_id', pagamentoId)
      if (r.error && semColunaPagoEm(r.error)) {
        temColunaPagoEm = false
        r = await db().from('compras').select('produto,status').eq('pagamento_id', pagamentoId)
      }
      if (r.error) throw r.error
      const existentes = (r.data ?? []) as { produto: string; status: string; pago_em?: string | null }[]
      jaEstavaPago = existentes.some((c) => c.status === 'pago')
      for (const c of existentes) if (c.pago_em) pagoEmGravado.set(c.produto, c.pago_em)
    }
    const linhas = p.produtos.map((produto) => ({
      email: p.email,
      produto,
      status: p.status,
      pagamento_id: pagamentoId,
      checkout_id: p.checkoutId,
      valor_centavos: p.valorCentavos,
      metodo: p.metodo,
      atualizado_em: recebidoEm.toISOString(),
      // só no aviso de PAGO: PIX gerado/pendente não grava nada aqui, então não inicia o prazo
      ...(p.status === 'pago' && temColunaPagoEm ? { pago_em: pagoEmDe(p, pagoEmGravado.get(produto), recebidoEm) } : {}),
    }))
    let { error } = await db().from('compras').upsert(linhas, { onConflict: 'pagamento_id,produto' })
    if (error && semColunaPagoEm(error)) {
      // migração do pago_em ainda não rodada: grava a compra mesmo assim (sem pago_em = sem desconto, o lado seguro)
      const semPagoEm = linhas.map(({ pago_em: _x, ...resto }: Record<string, unknown>) => resto)
      ;({ error } = await db().from('compras').upsert(semPagoEm, { onConflict: 'pagamento_id,produto' }))
    }
    if (error) throw error
    if (p.status === 'pago' && emailLigado() && !jaEstavaPago) {
      const r = await enviarEmailAcesso(p.email, p.produtos)
      await db().from('eventos').insert({ email: p.email, tipo: r.enviado ? 'email.acesso' : 'email.acesso.falhou', dados: { produtos: p.produtos, erro: r.erro ?? null } })
    }
    return json({ ok: true, produtos: p.produtos, status: p.status })
  } catch (e) {
    return falha(e)
  }
}
