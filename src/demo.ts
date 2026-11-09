// Modo prévia (VITE_DEMO=1): o app roda sem servidor, com dados de exemplo guardados só neste navegador.
// Só entra no build de prévia; o build de produção não inclui este arquivo.
import { materiaisLiberados, type ProdutoId } from '../shared/catalogo'
import { podeEscolher, presenteDe } from '../shared/presente'
import { descontoDe } from '../shared/desconto'

const CHAVE = 'fornada-previa'
type Usuaria = Record<string, unknown> & { produtos: ProdutoId[]; logada: boolean }

// na prévia ela já começa com 5 dias de entrada (🪙50) para dar para testar a escolha do presente
const novo = (): Usuaria => ({ logada: false, produtos: ['kit'], perfil: null, respostas: null, avatar: null, apelido: '', estado: null, dias: 5, presente: null })
function ler(): Usuaria {
  try { return { ...novo(), ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') } } catch { return novo() }
}
function gravar(u: Usuaria) {
  try { localStorage.setItem(CHAVE, JSON.stringify(u)) } catch { /* sem armazenamento: vale só nesta aba */ }
  memoria = u
}
let memoria: Usuaria | null = null
const atual = () => memoria ?? (memoria = ler())

const resposta = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json' } })

export function instalarPrevia() {
  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
    if (!url.pathname.endsWith('/api/eu') && !url.pathname.includes('/api/')) return original(input, init)
    const u = atual()
    const corpo = init?.body ? JSON.parse(String(init.body)) : {}
    const rota = url.pathname.slice(url.pathname.indexOf('/api/'))
    if (rota === '/api/entrar') { gravar({ ...u, logada: true }); return resposta({ ok: true }) }
    if (rota === '/api/sair') { gravar({ ...u, logada: false }); return resposta({ ok: true }) }
    if (rota === '/api/eu' && (init?.method ?? 'GET') === 'GET') {
      if (!u.logada) return resposta({ erro: 'Entre de novo.' }, 401)
      const { produtos, logada: _l, dias, presente, compras: _c, ...resto } = u
      return resposta({ email: 'maria.exemplo@gmail.com', ...resto, acesso: { produtos, pendentes: [], materiais: materiaisLiberados(produtos), desconto: descontoDe((u.compras as { produto: string; criado_em: string; pagamento_id: string }[] | undefined ?? []).map((c) => ({ ...c, status: 'pago' }))) }, presente: presenteDe(Number(dias), (presente as ProdutoId | null) ?? null) })
    }
    if (rota === '/api/presente') {
      const p = presenteDe(Number(u.dias), (u.presente as ProdutoId | null) ?? null)
      const ok = podeEscolher(p, corpo.produto, u.produtos)
      if (ok !== true) return resposta({ erro: ok }, 400)
      gravar({ ...u, presente: corpo.produto, produtos: [...u.produtos, corpo.produto] })
      return resposta({ ok: true })
    }
    if (rota === '/api/eu') { gravar({ ...u, ...corpo }); return resposta({ ok: true }) }
    return resposta({ ok: true })
  }
}

/** na prévia, "comprar" libera na hora (não abre a Wiapy) */
export function comprarNaPrevia(p: ProdutoId) {
  const u = atual()
  if (u.produtos.includes(p)) return
  const compras = (u.compras as unknown[] | undefined) ?? []
  const agora = new Date().toISOString()
  gravar({ ...u, produtos: [...u.produtos, p], compras: [...compras, { produto: p, criado_em: agora, pagamento_id: `previa-${p}` }] })
}

export function recomecarPrevia() {
  try { localStorage.removeItem(CHAVE); localStorage.removeItem('fornada-instalar') } catch { /* ok */ }
  memoria = null
  history.replaceState(null, '')
  location.reload()
}

export const PREVIA = import.meta.env.VITE_DEMO === '1'
