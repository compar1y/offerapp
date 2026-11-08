// Painel do Levi. Tudo exige o cabeçalho "Authorization: Bearer <ADMIN_TOKEN>".
// GET  /api/admin                         → números do app (perfis, onde param, ofertas, SOS, receitas)
// POST /api/admin { acao:'liberar', email, produto }           → libera acesso manual (ex.: compra antiga, suporte)
// POST /api/admin { acao:'importar', linhas:[{email,produto}] } → importa compradoras antigas (até 2000 por vez)
// POST /api/admin { acao:'bloquear', email, produto }          → tira o acesso (reembolso feito por fora)
import { ehProduto, type ProdutoId } from '../shared/catalogo.js'
import { PERFIS, TODAS_LICOES } from '../shared/conteudo.js'
import { db } from '../server/db.js'
import { exigir } from '../server/env.js'
import { corpoJson, emailValido, falha, json, normalizarEmail } from '../server/http.js'
import { iguais } from '../server/sessao.js'

function autorizado(req: Request): boolean {
  const h = req.headers.get('authorization') ?? ''
  const t = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
  return !!t && iguais(t, exigir('ADMIN_TOKEN'))
}

async function tudo<T>(tabela: string, colunas: string): Promise<T[]> {
  const out: T[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db().from(tabela).select(colunas).range(de, de + 999)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000 || out.length >= 50_000) return out
  }
}

const conta = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1)

export async function GET(req: Request): Promise<Response> {
  try {
    if (!autorizado(req)) return json({ erro: 'não autorizado' }, 401)
    type U = { email: string; perfil: string | null; estado: { licoes?: string[]; receitas?: number[] } | null; visto_em: string | null }
    type E = { email: string; tipo: string; dados: Record<string, unknown> }
    type C = { email: string; produto: string; status: string }
    const [usuarias, eventos, compras] = await Promise.all([
      tudo<U>('usuarias', 'email,perfil,estado,visto_em'),
      tudo<E>('eventos', 'email,tipo,dados'),
      tudo<C>('compras', 'email,produto,status'),
    ])
    const perfilDe = new Map(usuarias.map((u) => [u.email, u.perfil ?? 'sem perfil']))
    const porPerfil: Record<string, number> = {}
    for (const u of usuarias) conta(porPerfil, u.perfil ?? 'sem perfil')

    // onde elas param: quantas concluíram cada lição
    const licoes = TODAS_LICOES.map((l) => ({ id: l.id, titulo: l.titulo, concluiram: usuarias.filter((u) => u.estado?.licoes?.includes(l.id)).length }))

    // ofertas: vista → clicada → comprada, por perfil
    const ofertas: Record<string, Record<string, { vista: number; clicada: number; recusada: number; comprou: number }>> = {}
    const linha = (prod: string, perfil: string) => ((ofertas[prod] ??= {})[perfil] ??= { vista: 0, clicada: 0, recusada: 0, comprou: 0 })
    const vistos = new Set<string>()
    for (const e of eventos) {
      const prod = typeof e.dados?.produto === 'string' ? e.dados.produto : ''
      if (!prod) continue
      const chave = `${e.tipo}|${e.email}|${prod}`
      if (vistos.has(chave)) continue // conta pessoas, não cliques repetidos
      vistos.add(chave)
      const l = linha(prod, perfilDe.get(e.email) ?? 'sem perfil')
      if (e.tipo === 'oferta.vista') l.vista++
      else if (e.tipo === 'oferta.clicada') l.clicada++
      else if (e.tipo === 'oferta.recusada') l.recusada++
    }
    for (const c of compras) if (c.status === 'pago' && c.produto !== 'kit') linha(c.produto, perfilDe.get(c.email) ?? 'sem perfil').comprou++

    const sos: Record<string, number> = {}
    const receitas: Record<string, number> = {}
    for (const e of eventos) {
      if (e.tipo === 'sos.aberto') conta(sos, String(e.dados?.ficha ?? e.dados?.titulo ?? '?'))
      if (e.tipo === 'receita.aberta') conta(receitas, String(e.dados?.n ?? '?'))
    }
    const top = (m: Record<string, number>, n = 15) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)

    const agora = Date.now()
    const ativas7 = usuarias.filter((u) => u.visto_em && agora - Date.parse(u.visto_em) < 7 * 864e5).length
    const compradoras = new Set(compras.filter((c) => c.status === 'pago').map((c) => c.email)).size

    return json({
      resumo: { compradoras, entraram: usuarias.length, fizeramOnboarding: usuarias.filter((u) => u.perfil).length, ativasUltimos7Dias: ativas7 },
      perfis: Object.fromEntries(Object.entries(porPerfil).map(([k, v]) => [PERFIS[k as keyof typeof PERFIS]?.nome ?? k, v])),
      licoes,
      ofertas,
      sosMaisAbertos: top(sos),
      receitasMaisAbertas: top(receitas),
    })
  } catch (e) {
    return falha(e)
  }
}

async function liberar(email: string, produto: ProdutoId, status: 'pago' | 'estornado') {
  const { error } = await db()
    .from('compras')
    .upsert({ email, produto, status, pagamento_id: `manual:${email}`, checkout_id: 'manual', metodo: 'manual', atualizado_em: new Date().toISOString() }, { onConflict: 'pagamento_id,produto' })
  if (error) throw error
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!autorizado(req)) return json({ erro: 'não autorizado' }, 401)
    const b = (await corpoJson(req, 500_000)) as { acao?: string; email?: unknown; produto?: unknown; linhas?: unknown }
    if (b.acao === 'liberar' || b.acao === 'bloquear') {
      const email = normalizarEmail(b.email)
      const produto = typeof b.produto === 'string' ? b.produto : ''
      if (!emailValido(email) || !ehProduto(produto)) return json({ erro: 'e-mail ou produto inválido' }, 400)
      await liberar(email, produto, b.acao === 'liberar' ? 'pago' : 'estornado')
      return json({ ok: true })
    }
    if (b.acao === 'importar') {
      if (!Array.isArray(b.linhas) || b.linhas.length > 2000) return json({ erro: 'mande até 2000 linhas' }, 400)
      let ok = 0
      const erros: number[] = []
      for (const [i, l] of b.linhas.entries()) {
        const email = normalizarEmail((l as Record<string, unknown>)?.email)
        const produto = String((l as Record<string, unknown>)?.produto ?? 'kit')
        if (!emailValido(email) || !ehProduto(produto)) {
          erros.push(i + 1)
          continue
        }
        await liberar(email, produto, 'pago')
        ok++
      }
      return json({ ok, linhasComErro: erros })
    }
    return json({ erro: 'ação desconhecida' }, 400)
  } catch (e) {
    return falha(e)
  }
}
