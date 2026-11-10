// Webhook da Wiapy. Formato pela documentação pública (help.wiapy.com, artigo "webhook"):
//   POST JSON; token no header Authorization; valores em centavos; sem campo de evento.
//   payment.status: paid | unpaid | credit_card_declined | refunded | chargedback; carrinho abandonado = payment null.
// Formato real (webhook_bruto, 08/11): checkout.id = id interno do checkout; products[].id = id de cada conteúdo entregue.
// O app reconhece cada item pelo conteúdo (PRODUTOS[...].produtoIds) e só usa o checkout quando nenhum conteúdo casar.
import { BUMP_RECHEIOS, PRODUTOS, type ProdutoId } from '../shared/catalogo.js'
import { PRECO_PRESENTE } from '../shared/desconto.js'
import { produtoDoCheckoutDesconto, produtoDoConteudoDesconto } from '../shared/popupDesconto.js'
import { env } from './env.js'

export type StatusCompra = 'pago' | 'pendente' | 'recusado' | 'estornado'

export interface Pedido {
  tipo: 'pagamento' | 'abandono' | 'invalido'
  pagamentoId: string
  status: StatusCompra | null
  statusBruto: string
  email: string
  checkoutId: string
  valorCentavos: number | null
  metodo: string
  produtos: ProdutoId[]
  bumpTitulos: string[]
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const txt = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const centavos = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? Math.round(n) : null
}

const STATUS: Record<string, StatusCompra> = {
  paid: 'pago',
  unpaid: 'pendente',
  pending: 'pendente',
  credit_card_declined: 'recusado',
  refunded: 'estornado',
  chargedback: 'estornado',
  chargeback: 'estornado',
}

/** JSON dos exemplos da doc às vezes vem com vírgula faltando ou sobrando */
export function lerJsonTolerante(bruto: string): unknown {
  try {
    return JSON.parse(bruto)
  } catch {
    return JSON.parse(bruto.replace(/("|\d|true|false|null|\}|\])([ \t]*\r?\n\s*)(")/g, '$1,$2$3').replace(/,(\s*[}\]])/g, '$1'))
  }
}

const idsExtras = (nome: string) =>
  env(nome)
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

/** qual produto principal este checkout vende (ids do catálogo + variáveis CHECKOUT_IDS_<PRODUTO>) */
export function produtoDoCheckout(checkoutId: string): ProdutoId | null {
  if (!checkoutId) return null
  for (const p of Object.values(PRODUTOS)) {
    const ids = [...p.checkoutIds, ...(PRECO_PRESENTE[p.id]?.checkoutIds ?? []), ...idsExtras(`CHECKOUT_IDS_${p.id.toUpperCase()}`)]
    if (ids.includes(checkoutId)) return p.id
  }
  // checkout com desconto do popup pós-compra: é o mesmo produto
  return produtoDoCheckoutDesconto(checkoutId)
}

export function lerPedido(corpo: unknown): Pedido {
  const b = obj(corpo)
  const pagamento = b.payment == null ? null : obj(b.payment)
  const cliente = obj(b.customer)
  const checkout = obj(b.checkout)
  const checkoutId = txt(checkout.id)
  const bumps = lista(checkout.orderbump).map((o) => ({ id: txt(obj(o).id), titulo: txt(obj(o).title) }))
  const prods = lista(b.products).map((p) => ({ id: txt(obj(p).id), titulo: txt(obj(p).title) }))
  const base: Pedido = {
    tipo: 'invalido',
    pagamentoId: '',
    status: null,
    statusBruto: '',
    email: txt(cliente.email).toLowerCase(),
    checkoutId,
    valorCentavos: null,
    metodo: '',
    produtos: [],
    bumpTitulos: bumps.map((x) => x.titulo),
  }
  if (!corpo || typeof corpo !== 'object') return base
  if (pagamento === null) return { ...base, tipo: 'abandono' }

  // TODOS os itens comprados (products[].id), cada um pelo id do conteúdo.
  // O checkout.id é só reserva: no upsell de 1 clique ele pode vir com o id do checkout do kit.
  const porItem = Object.values(PRODUTOS)
    .filter((p) => p.produtoIds?.some((id) => prods.some((x) => x.id === id)))
    .map((p) => p.id)
  // conteúdo com desconto do popup pós-compra (shared/popupDesconto.ts): conta como o mesmo produto
  for (const x of prods) {
    const p = produtoDoConteudoDesconto(x.id)
    if (p && !porItem.includes(p)) porItem.push(p)
  }
  const produtos: ProdutoId[] = porItem.length ? porItem : ([produtoDoCheckout(checkoutId)].filter(Boolean) as ProdutoId[])
  const valor = centavos(pagamento.amount) ?? centavos(checkout.amount)

  // bump dos Recheios no pedido do kit: pelo id (BUMP_RECHEIOS.ids), pelo título ("recheio") ou pelo valor total kit + bump
  if (produtos.includes('kit') && !produtos.includes('recheios')) {
    const idsBump = [...BUMP_RECHEIOS.ids, ...idsExtras('BUMP_RECHEIOS_IDS')]
    const casa = (x: { id: string; titulo: string }) => idsBump.includes(x.id) || BUMP_RECHEIOS.trechosTitulo.some((t) => x.titulo.toLowerCase().includes(t))
    const temBump = bumps.some(casa) || prods.some(casa) || valor === BUMP_RECHEIOS.totalComKitCentavos
    if (temBump) produtos.push('recheios')
  }

  const statusBruto = txt(pagamento.status)
  return {
    ...base,
    tipo: 'pagamento',
    pagamentoId: txt(pagamento.id),
    statusBruto,
    status: STATUS[statusBruto] ?? null,
    valorCentavos: valor,
    metodo: txt(pagamento.payment_method),
    produtos,
  }
}

/** corpo sem dados pessoais, para conferir o formato real */
export function semDadosPessoais(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(semDadosPessoais)
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) o[k] = /email|name|phone|document|cpf|address|ip/i.test(k) ? '***' : semDadosPessoais(x)
    return o
  }
  return v
}
