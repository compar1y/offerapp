// Portão dos arquivos (Vercel Routing Middleware, roda no Edge antes de qualquer arquivo de public/).
//   /aulas/aula-NN.mp4  → só quem está logada e comprou as Videoaulas (ou o kit, com VITE_AULAS_ACESSO=kit)
//   /downloads/<arquivo> → só quem tem o material daquele arquivo (shared/acesso.ts, ARQUIVOS)
// Sem cookie válido: 401. Sem a compra: 403. Servidor sem configuração: 503. Nada sai sem passar por aqui.
// A sessão é o mesmo cookie "fornada" de server/sessao.ts (HMAC-SHA256 com SESSION_SECRET), conferido com Web Crypto.
import { ehAula } from './shared/aulas.js'
import { arquivoPorNome, podeBaixar, podeVerAulasCom, produtosDe, type LinhaCompra } from './shared/acesso.js'

export const config = { matcher: ['/aulas/:path*', '/downloads/:path*'] }

const COOKIE = 'fornada'

const resposta = (status: number, msg: string) =>
  new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })

/** deixa a Vercel entregar o arquivo de public/ (o mesmo que next() de @vercel/functions) */
const seguir = () => new Response(null, { headers: { 'x-middleware-next': '1' } })

function deB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

function cookie(req: Request, nome: string): string {
  for (const parte of (req.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return v.join('=')
  }
  return ''
}

/** e-mail da sessão, ou null se o cookie não existe, foi mexido ou venceu */
export async function emailDoCookie(token: string, segredo: string, agora = Date.now()): Promise<string | null> {
  const [dado, sig] = token.split('.')
  if (!dado || !sig) return null
  try {
    const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify('HMAC', chave, deB64url(sig), new TextEncoder().encode(dado))
    if (!ok) return null
    const { e, x } = JSON.parse(new TextDecoder().decode(deB64url(dado))) as { e?: unknown; x?: unknown }
    return typeof e === 'string' && typeof x === 'number' && x > agora ? e : null
  } catch {
    return null
  }
}

async function comprasDe(email: string, url: string, chave: string): Promise<LinhaCompra[]> {
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/compras?select=produto,status,metodo,criado_em,atualizado_em&email=eq.${encodeURIComponent(email)}`, {
    headers: { apikey: chave, authorization: `Bearer ${chave}` },
  })
  if (!r.ok) throw new Error(`supabase ${r.status}`)
  return (await r.json()) as LinhaCompra[]
}

export default async function middleware(req: Request): Promise<Response> {
  const caminho = decodeURIComponent(new URL(req.url).pathname)
  const [, pasta, nome = '', ...resto] = caminho.split('/')
  const aula = pasta === 'aulas' && !resto.length && ehAula(nome)
  const arquivo = pasta === 'downloads' && !resto.length ? arquivoPorNome(nome) : undefined
  if (!aula && !arquivo) return resposta(404, 'Arquivo não encontrado.')

  const segredo = process.env.SESSION_SECRET ?? ''
  const url = process.env.SUPABASE_URL ?? ''
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!segredo || !url || !chave) return resposta(503, 'O servidor ainda não está configurado.')

  const email = await emailDoCookie(cookie(req, COOKIE), segredo)
  if (!email) return resposta(401, 'Entre no app com o e-mail da compra.')

  let produtos
  try {
    produtos = produtosDe(await comprasDe(email, url, chave)).produtos
  } catch (e) {
    console.error('middleware: não consegui ler as compras', e)
    return resposta(503, 'Não consegui conferir sua compra agora. Tente de novo em instantes.')
  }
  const modo = process.env.VITE_AULAS_ACESSO === 'kit' ? 'kit' : 'venda'
  const pode = aula ? podeVerAulasCom(produtos, modo) : podeBaixar(produtos, arquivo!)
  if (!pode) return resposta(403, aula ? 'As aulas em vídeo são para quem comprou as Videoaulas.' : 'Este material não está no seu acesso.')
  return seguir()
}
