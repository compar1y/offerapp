// Catálogo, ticket e direitos. Fonte ÚNICA usada pelo app (src/) e pelo servidor (api/).
// Sem dependência de navegador nem de Node: pode ser importado dos dois lados.
//
// DECISÃO DO LEVI (26/10/2026): existe UM ticket só, o kit completo de R$ 37,90 (checkout r2PHgYwK6CVi):
//   produto principal + bônus 01 a 07 + bônus 08 EXTRA.
//   Bump (+20 Fichas de Socorro, R$ 7,90) = compra à parte, vale para quem tem o kit.
//   Ofertas adicionais (OFFERS) = 3 slots, todos desligados por padrão.
// Para mudar o que o kit libera, edite SÓ o objeto ENTITLEMENTS abaixo.

export type ItemId =
  | 'main'
  | 'bonus-01'
  | 'bonus-02'
  | 'bonus-03'
  | 'bonus-04'
  | 'bonus-05'
  | 'bonus-06'
  | 'bonus-07'
  | 'bonus-08'
  | 'bump'
  // ofertas adicionais (OFFERS). Só existem quando enabled = true
  | 'kit-lucrativo'
  | 'kit-embalagem-etiqueta'
  | 'fornada-pascoa'

export type FileKind = 'pdf' | 'txt' | 'docx' | 'xlsx'

export interface FileEntry {
  id: string
  label: string
  kind: FileKind
  // chave no armazenamento PRIVADO (pasta FILES_DIR ou Vercel Blob privado). Nunca em public/.
  storageKey: string
  pages?: number
}

export interface Item {
  id: ItemId
  kind: 'main' | 'bonus' | 'bump' | 'offer'
  // "BÔNUS 01", "PRODUTO PRINCIPAL"...
  badge: string
  title: string
  subtitle: string
  description: string
  // o que vem dentro (bullets curtos)
  includes: string[]
  extra?: boolean
  files: FileEntry[]
}

const pdf = (id: string, label: string, pages: number): FileEntry => ({
  id,
  label,
  kind: 'pdf',
  storageKey: `${id}.pdf`,
  pages,
})
const other = (id: string, label: string, kind: Exclude<FileKind, 'pdf'>): FileEntry => ({
  id,
  label,
  kind,
  storageKey: `${id}.${kind}`,
})

export const ITEMS: Item[] = [
  {
    id: 'main',
    kind: 'main',
    badge: 'PRODUTO PRINCIPAL',
    title: 'Fábrica de Panetones Caseiros',
    subtitle: '100 receitas passo a passo em PDF',
    description:
      'As 100 receitas da Fábrica, passo a passo e com fotos, para fazer em casa. Abra no celular e vá direto à receita que quiser.',
    includes: ['100 receitas passo a passo', 'Fotos em cada receita', 'PDF para ler no celular ou imprimir'],
    files: [pdf('produto-principal', 'Fábrica de Panetones Caseiros: 100 Receitas', 100)],
  },
  {
    id: 'bonus-01',
    kind: 'bonus',
    badge: 'BÔNUS 01',
    title: 'Guia de Embalagem Que Vende',
    subtitle: 'Embalagens para presentear e vender',
    description: 'Ideias de embalagem para o seu panetone chegar bonito, seja para presente ou para encomenda.',
    includes: ['Guia em PDF com 13 páginas', 'Ideias de embalagem para o Natal'],
    files: [pdf('bonus-01-guia-de-embalagem', 'Guia de Embalagem Que Vende', 13)],
  },
  {
    id: 'bonus-02',
    kind: 'bonus',
    badge: 'BÔNUS 02',
    title: '20 Ideias de Kits de Natal',
    subtitle: 'Kits com panetone e minipanetones',
    description: 'Vinte ideias de kits natalinos com panetones e minipanetones para presentear ou oferecer.',
    includes: ['Guia em PDF com 24 páginas', '20 ideias de kits'],
    files: [pdf('bonus-02-20-ideias-de-kits-de-natal', '20 Ideias de Kits de Natal', 24)],
  },
  {
    id: 'bonus-03',
    kind: 'bonus',
    badge: 'BÔNUS 03',
    title: 'Cardápio e Fotos',
    subtitle: 'Cardápio de Natal pronto para o WhatsApp',
    description: 'Um guia para montar o cardápio e tirar boas fotos, mais o texto do cardápio pronto para copiar no WhatsApp.',
    includes: ['Guia em PDF com 8 páginas', 'Cardápio de Natal para copiar (TXT)', 'Cardápio de Natal para editar (Word)'],
    files: [
      pdf('bonus-03-guia-cardapio-e-fotos', 'Guia: Cardápio e Fotos', 8),
      other('bonus-03-cardapio-de-natal-whatsapp', 'Cardápio de Natal para WhatsApp (texto)', 'txt'),
      other('bonus-03-cardapio-de-natal-whatsapp', 'Cardápio de Natal para WhatsApp (Word)', 'docx'),
    ],
  },
  {
    id: 'bonus-04',
    kind: 'bonus',
    badge: 'BÔNUS 04',
    title: 'Mensagens de Natal',
    subtitle: 'Mensagens de pré-venda e encomenda',
    description: 'Mensagens prontas para avisar, receber encomendas e acompanhar os pedidos pelo WhatsApp.',
    includes: ['Guia em PDF com 13 páginas', 'Mensagens para copiar (TXT)', 'Mensagens para editar (Word)'],
    files: [
      pdf('bonus-04-guia-mensagens-de-natal', 'Guia: Mensagens de Natal', 13),
      other('bonus-04-mensagens-de-natal', 'Mensagens de Natal (texto)', 'txt'),
      other('bonus-04-mensagens-de-natal', 'Mensagens de Natal (Word)', 'docx'),
    ],
  },
  {
    id: 'bonus-05',
    kind: 'bonus',
    badge: 'BÔNUS 05',
    title: 'Planejador de Produção de Natal',
    subtitle: 'Organize as fornadas até o dia 24',
    description: 'Um planejador para organizar pedidos, compras e fornadas, em PDF para imprimir e em planilha.',
    includes: ['Guia do Planejador em PDF', 'Planejador imprimível em PDF', 'Planilha de produção (Excel)'],
    files: [
      pdf('bonus-05-guia-do-planejador', 'Guia do Planejador', 8),
      pdf('bonus-05-planejador-imprimivel', 'Planejador Imprimível', 6),
      other('bonus-05-planejador-de-producao-natal', 'Planilha: Planejador de Produção de Natal', 'xlsx'),
    ],
  },
  {
    id: 'bonus-06',
    kind: 'bonus',
    badge: 'BÔNUS 06',
    title: 'Plano B: Trufado Rápido',
    subtitle: 'Uma saída trufada quando falta tempo',
    description: 'Um plano B com chocotone trufado rápido para quando a fornada principal não sair como o planejado.',
    includes: ['Guia em PDF com 10 páginas'],
    files: [pdf('bonus-06-plano-b-trufado-rapido', 'Plano B: Trufado Rápido', 10)],
  },
  {
    id: 'bonus-07',
    kind: 'bonus',
    badge: 'BÔNUS 07',
    title: 'Tabela de Custo e Preço de Venda',
    subtitle: 'Quanto custa e quanto cobrar nas 100 receitas',
    description:
      'Custo e preço de venda de cada uma das 100 receitas, com três faixas de preço. Os valores são estimativas: ajuste ao mercado da sua cidade. A tabela é conta, não promessa.',
    includes: ['Tabela em PDF com 50 páginas', 'Custo por unidade e 3 faixas de preço', 'Fórmula de preço e ponto de equilíbrio'],
    files: [pdf('bonus-07-tabela-de-custo-e-preco', 'Tabela de Custo e Preço de Venda', 50)],
  },
  {
    id: 'bonus-08',
    kind: 'bonus',
    badge: 'BÔNUS 08 · EXTRA',
    title: '50 Receitas do Cardápio de Natal',
    subtitle: 'Pão de mel, biscoitos, rabanadas, bolotones e cookies',
    description: 'Cinquenta fichas completas, com ingredientes, modo de preparo e fotos ilustrativas, para ampliar o cardápio de Natal.',
    includes: ['Livro em PDF com 60 páginas', '50 receitas do cardápio de Natal'],
    extra: true,
    files: [pdf('bonus-08-50-receitas-cardapio-de-natal', '50 Receitas: Cardápio de Natal', 60)],
  },
  {
    id: 'bump',
    kind: 'bump',
    badge: '+20 FICHAS',
    title: '+20 Fichas de Socorro do Panetone',
    subtitle: 'Ache o problema pelo que você vê',
    description:
      'Murchou, solou, não cresceu ou queimou? Ache o problema pelo que você está vendo, saiba se ainda dá para salvar e o que mudar na próxima fornada.',
    includes: ['25 páginas em PDF, mais de 20 fichas', 'Índice pelo que você está vendo', 'Checagem de 1 minuto antes de cada fornada'],
    files: [pdf('bump-20-fichas-de-socorro', '+20 Fichas de Socorro do Panetone', 25)],
  },
]

// ---------------------------------------------------------------- ofertas adicionais (OFFERS), TODAS DESLIGADAS
// Lista editável. Cada oferta é uma compra ADICIONAL, sempre marcada como tal, e some para quem já comprou.
// Para ligar uma oferta: preencha checkoutUrl e wiapyProductId, cadastre o arquivo em `files`, suba o arquivo no
// armazenamento privado e troque enabled para true. Com enabled = false NADA aparece para o cliente e o servidor não libera nada.
// Em modo demonstração, o botão "Ofertas desligadas/ligadas" da barra de teste liga as três só para ver o visual.
export type OfferId = 'kit-lucrativo' | 'kit-embalagem-etiqueta' | 'fornada-pascoa'
export type OfferKind = 'upsell' | 'downsell' | 'seasonal'
export type OfferPlacement =
  | 'home-banner' // banner na home (imagem em cima, informação embaixo)
  | 'item-footer' // rodapé da página de uma receita/bônus, depois de o cliente marcar "Fiz essa"
  | 'home-card' // card com cadeado e mockup entre os cards da home

export interface Offer {
  id: OfferId
  kind: OfferKind
  enabled: boolean
  title: string
  subtitle: string
  // o que é, em 1 ou 2 frases, sem promessa de renda
  description: string
  includes: string[]
  // preço em centavos
  priceCents: number
  // TODO: link do checkout (vazio = o botão abre o WhatsApp; na oferta sazonal vira "Quero ser avisada")
  checkoutUrl: string
  // TODO: id do produto na Wiapy (checkout.id, orderbump[].id ou products[].id)
  wiapyProductId: string
  titleHints: string[]
  placement: OfferPlacement[]
  // só aparece depois de o cliente dispensar ("Agora não") esta outra oferta e se ele não a tiver comprado
  requiresDismissed?: OfferId
  // arquivo do mockup em public/img (PNG/WebP com fundo transparente, 533x800). null = ainda não existe (ver IMAGENS-FALTANDO.md)
  cover: string | null
  files: FileEntry[]
}

export const OFFERS: Offer[] = [
  {
    id: 'kit-lucrativo',
    kind: 'upsell',
    enabled: false,
    title: 'Kit Panetone Lucrativo',
    subtitle: 'Material complementar para organizar a produção e a venda',
    description: 'Um material complementar para quem quer organizar melhor a produção e a venda dos panetones. É uma compra à parte e não está no seu kit.',
    includes: [],
    priceCents: 7700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['kit panetone lucrativo'],
    placement: ['home-banner', 'item-footer'],
    cover: null,
    files: [],
  },
  {
    id: 'kit-embalagem-etiqueta',
    kind: 'downsell',
    enabled: false,
    title: 'Kit Embalagem e Etiqueta',
    subtitle: 'Etiquetas e rótulos imprimíveis',
    description:
      'Etiquetas e rótulos prontos para imprimir em casa e colar em caixas, sacos e kits. Complementa o Bônus 01 (Guia de Embalagem), que ensina a embalar: aqui você recebe só as etiquetas e os rótulos.',
    includes: ['Etiquetas e rótulos para imprimir', 'Para colar em caixas, sacos e kits'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['kit embalagem e etiqueta'],
    placement: ['home-banner', 'item-footer'],
    requiresDismissed: 'kit-lucrativo',
    cover: null,
    files: [],
  },
  {
    id: 'fornada-pascoa',
    kind: 'seasonal',
    enabled: false,
    title: 'Fornada de Páscoa',
    subtitle: 'Material de Páscoa, em preparação',
    description: 'Um material sazonal para a próxima fornada, a de Páscoa. Ainda em preparação: toque para dizer que tem interesse.',
    includes: [],
    priceCents: 7700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['fornada de páscoa'],
    placement: ['home-card'],
    cover: null,
    files: [],
  },
]

export const OFFER_IDS: OfferId[] = OFFERS.map((o) => o.id)
export const isOfferId = (id: string): id is OfferId => (OFFER_IDS as string[]).includes(id)

// cada oferta como Item (lê a configuração na hora, para refletir o que estiver ligado)
const offerItems: Item[] = OFFERS.map((o) => ({
  id: o.id,
  kind: 'offer' as const,
  badge: 'COMPRA ADICIONAL',
  get title() {
    return o.title
  },
  get subtitle() {
    return o.subtitle
  },
  get description() {
    return o.description
  },
  get includes() {
    return o.includes
  },
  get files() {
    return o.files
  },
}))

export const ITEM_BY_ID = { ...Object.fromEntries(ITEMS.map((i) => [i.id, i])), ...Object.fromEntries(offerItems.map((i) => [i.id, i])) } as Record<ItemId, Item>

export const OFFER_BY_ID = Object.fromEntries(OFFERS.map((o) => [o.id, o])) as Record<OfferId, Offer>

// a chave pública do arquivo é o nome dele no armazenamento privado (inclui a extensão: um bônus pode ter .txt e .docx)
export function fileKey(f: FileEntry): string {
  return f.storageKey
}
export function findFile(key: string): { file: FileEntry; item: Item } | null {
  for (const item of [...ITEMS, ...offerItems.filter((i) => OFFER_BY_ID[i.id as OfferId].enabled)]) {
    for (const file of item.files) if (fileKey(file) === key) return { file, item }
  }
  return null
}

// ---------------------------------------------------------------- kit completo (único ticket)

export type PlanId = 'completo'

export interface Plan {
  id: PlanId
  name: string
  priceCents: number
  // código do checkout na URL pública da Wiapy (pay.wiapy.com/<slug>). É o id esperado em checkout.id no webhook.
  wiapyCheckoutSlug: string
  // id interno do mesmo checkout (alternativa caso a Wiapy mande o id interno em checkout.id)
  wiapyCheckoutId: string
  // TODO: id do produto/entregável na Wiapy (preencher depois)
  wiapyProductId: string
  checkoutUrl: string
}

export const PLANS: Record<PlanId, Plan> = {
  completo: {
    id: 'completo',
    name: 'Kit completo',
    priceCents: 3790,
    wiapyCheckoutSlug: 'r2PHgYwK6CVi',
    wiapyCheckoutId: '6accaf7eb11ba1ecaf89b37e',
    wiapyProductId: '',
    checkoutUrl: 'https://pay.wiapy.com/r2PHgYwK6CVi',
  },
}

export const COMPLETE_ITEMS: ItemId[] = [
  'main',
  'bonus-01',
  'bonus-02',
  'bonus-03',
  'bonus-04',
  'bonus-05',
  'bonus-06',
  'bonus-07',
  'bonus-08',
]

// EDITÁVEL: o que o kit libera
export const ENTITLEMENTS: Record<PlanId, ItemId[]> = {
  completo: COMPLETE_ITEMS,
}

export interface Bump {
  itemId: ItemId
  priceCents: number
  // id interno do produto do bump na Wiapy (aparece em checkout.orderbump[].id e/ou products[].id)
  wiapyProductId: string
  // trechos do título, para reconhecer o bump mesmo se o id vier diferente
  titleHints: string[]
  // TODO: link do checkout avulso do bump, se existir (vazio = WhatsApp)
  checkoutUrl: string
}

export const BUMP: Bump = {
  itemId: 'bump',
  priceCents: 790,
  wiapyProductId: '6ad318de6ebcdbf668bb03c1',
  titleHints: ['fichas de socorro'],
  checkoutUrl: '',
}

export function itemsFor(plan: PlanId | null, hasBump: boolean, offers: string[] = []): ItemId[] {
  const set = new Set<ItemId>(plan ? ENTITLEMENTS[plan] : [])
  if (hasBump) set.add(BUMP.itemId)
  for (const id of offers) if (isOfferId(id) && OFFER_BY_ID[id].enabled) set.add(id)
  return [...set]
}

export function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Lista PADRÃO de checkouts que liberam o kit completo (a variável FULL_KIT_CHECKOUT_IDS do servidor sobrescreve).
// Contém o código público e o id interno do MESMO checkout R$ 37,90.
export const DEFAULT_FULL_KIT_CHECKOUT_IDS: string[] = [PLANS.completo.wiapyCheckoutSlug, PLANS.completo.wiapyCheckoutId]

// ---------------------------------------------------------------- tipos de sessão (contrato /api/me)

// pending = PIX gerado, NÃO libera nada. paid = libera. refunded/chargeback = revoga. declined = cartão recusado, não libera.
export type PurchaseStatus = 'pending' | 'paid' | 'refunded' | 'chargeback' | 'declined'

export interface PurchaseView {
  orderId: string
  plan: PlanId | null
  bump: boolean
  offers?: OfferId[]
  status: PurchaseStatus
  source: 'wiapy' | 'manual' | 'csv'
  createdAt: string
}

export interface MeResponse {
  email: string
  plan: PlanId | null
  items: ItemId[]
  purchases: PurchaseView[]
}
