// POST /api/entrar  { email }  → entra com o e-mail da compra (sem senha)
import { db } from '../server/db.js'
import { corpoJson, emailValido, falha, json, normalizarEmail } from '../server/http.js'
import { cookieDeSessao } from '../server/sessao.js'
import { produtosDe, temCompraReal } from '../shared/acesso.js'

export async function POST(req: Request): Promise<Response> {
  try {
    const { email: bruto } = (await corpoJson(req, 2000)) as { email?: unknown }
    const email = normalizarEmail(bruto)
    if (!emailValido(email)) return json({ erro: 'Confira o e-mail: parece que falta o @ ou o ponto.' }, 400)
    const { data, error } = await db().from('compras').select('produto,status,metodo,criado_em,atualizado_em').eq('email', email)
    if (error) throw error
    // precisa de uma compra paga de verdade: o livro ganho com moedas sozinho não abre (ex.: reembolsou o kit)
    if (!temCompraReal(data ?? [])) {
      if (produtosDe(data ?? []).pendentes.length)
        return json({ erro: 'Seu pagamento ainda não foi confirmado. Se pagou no PIX, espere uns minutos e tente de novo.' }, 403)
      return json({ erro: 'Não achamos uma compra com esse e-mail. Use o mesmo e-mail do pagamento ou fale com o suporte.' }, 404)
    }
    await db().from('usuarias').upsert({ email, visto_em: new Date().toISOString() }, { onConflict: 'email', ignoreDuplicates: false })
    await db().from('eventos').insert({ email, tipo: 'login', dados: {} })
    return json({ ok: true }, 200, { 'set-cookie': cookieDeSessao(email) })
  } catch (e) {
    return falha(e)
  }
}
