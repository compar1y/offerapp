// POST /api/presente { produto } → libera 1 livro de presente (conferido aqui: saldo, se já escolheu, se já tem)
import type { ProdutoId } from '../shared/catalogo.js'
import { podeEscolher } from '../shared/presente.js'
import { acessoDe } from '../server/acesso.js'
import { db } from '../server/db.js'
import { corpoJson, falha, json } from '../server/http.js'
import { presenteAtual } from '../server/presente.js'
import { emailDaSessao } from '../server/sessao.js'

export async function POST(req: Request): Promise<Response> {
  try {
    const email = emailDaSessao(req)
    if (!email) return json({ erro: 'Entre de novo com o e-mail da compra.' }, 401)
    const { produto } = (await corpoJson(req, 500)) as { produto?: unknown }
    const [p, acesso] = await Promise.all([presenteAtual(email), acessoDe(email)])
    const ok = podeEscolher(p, produto as ProdutoId, acesso.produtos)
    if (ok !== true) return json({ erro: ok }, 400)
    const agora = new Date().toISOString()
    const { error } = await db().from('compras').insert({
      email, produto, status: 'pago', pagamento_id: `presente:${email}`, checkout_id: 'presente', metodo: 'presente', valor_centavos: 0, criado_em: agora, atualizado_em: agora,
    })
    if (error) throw error
    await db().from('eventos').insert({ email, tipo: 'presente.escolhido', dados: { produto } })
    return json({ ok: true })
  } catch (e) {
    return falha(e)
  }
}
