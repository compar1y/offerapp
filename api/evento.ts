// POST /api/evento { tipo, dados } → registra o uso (para o painel do Levi). Só tipos conhecidos.
import { db } from '../server/db.js'
import { corpoJson, falha, json } from '../server/http.js'
import { emailDaSessao } from '../server/sessao.js'

const TIPOS = new Set(['onboarding', 'licao.aberta', 'licao.feita', 'receita.aberta', 'receita.feita', 'sos.aberto', 'pagina.aberta', 'oferta.vista', 'oferta.clicada', 'oferta.recusada', 'bau.aberto', 'loja.troca', 'missao.perfil', 'inicio.clique', 'navbar.clique', 'onboarding.passo'])

export async function POST(req: Request): Promise<Response> {
  try {
    const email = emailDaSessao(req)
    if (!email) return json({ erro: 'sem sessão' }, 401)
    const { tipo, dados } = (await corpoJson(req, 4000)) as { tipo?: unknown; dados?: unknown }
    if (typeof tipo !== 'string' || !TIPOS.has(tipo)) return json({ erro: 'tipo desconhecido' }, 400)
    const d = dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {}
    const { error } = await db().from('eventos').insert({ email, tipo, dados: d })
    if (error) throw error
    return json({ ok: true })
  } catch (e) {
    return falha(e)
  }
}
