// GET  /api/eu  → perfil, estado do jogo e o que ela comprou
// POST /api/eu  { perfil?, respostas?, avatar?, apelido?, estado? } → salva
import { PERFIS, type PerfilId } from '../shared/conteudo.js'
import { hojeBR, sanear } from '../shared/jogo.js'
import { acessoDe } from '../server/acesso.js'
import { db } from '../server/db.js'
import { corpoJson, falha, json } from '../server/http.js'
import { emailDaSessao } from '../server/sessao.js'

export async function GET(req: Request): Promise<Response> {
  try {
    const email = emailDaSessao(req)
    if (!email) return json({ erro: 'Entre de novo com o e-mail da compra.' }, 401)
    const [{ data, error }, acesso] = await Promise.all([db().from('usuarias').select('perfil,respostas,avatar,apelido,estado').eq('email', email).maybeSingle(), acessoDe(email)])
    if (error) throw error
    if (acesso.produtos.length === 0) return json({ erro: 'Seu acesso foi encerrado. Fale com o suporte.' }, 403)
    await db().from('usuarias').update({ visto_em: new Date().toISOString() }).eq('email', email)
    return json({ email, perfil: data?.perfil ?? null, respostas: data?.respostas ?? null, avatar: data?.avatar ?? null, apelido: data?.apelido ?? '', estado: data?.estado && Object.keys(data.estado).length ? sanear(data.estado, hojeBR()) : null, acesso })
  } catch (e) {
    return falha(e)
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const email = emailDaSessao(req)
    if (!email) return json({ erro: 'Entre de novo com o e-mail da compra.' }, 401)
    const b = (await corpoJson(req)) as Record<string, unknown>
    const up: Record<string, unknown> = {}
    if (typeof b.perfil === 'string' && b.perfil in PERFIS) up.perfil = b.perfil as PerfilId
    if (Array.isArray(b.respostas) && b.respostas.length === 5 && b.respostas.every((n) => Number.isInteger(n) && n >= 0 && n <= 2)) up.respostas = b.respostas
    if (Number.isInteger(b.avatar) && (b.avatar as number) >= 0 && (b.avatar as number) < 6) up.avatar = b.avatar
    if (typeof b.apelido === 'string') up.apelido = b.apelido.trim().slice(0, 24)
    if (b.estado !== undefined) up.estado = sanear(b.estado, hojeBR())
    if (!Object.keys(up).length) return json({ ok: true })
    const { error } = await db().from('usuarias').update(up).eq('email', email)
    if (error) throw error
    return json({ ok: true })
  } catch (e) {
    return falha(e)
  }
}
