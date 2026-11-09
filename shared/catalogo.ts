// Produtos, materiais e o que cada compra libera. Fonte única para o app (src/) e o servidor (api/, server/).
// Regra do Levi: tudo o que a cliente comprou fica ABERTO desde o primeiro minuto. Nada comprado é travado por progresso.

export type ProdutoId = 'kit' | 'recheios' | 'encomenda' | 'primeira' | 'videoaulas'

export type MaterialId =
  | 'ebook'
  | 'b01' | 'b02' | 'b03' | 'b04' | 'b05-guia' | 'b05-imprimivel' | 'b06' | 'b07' | 'b08'
  | 'fichas-socorro'
  | 'recheios'
  | 'encomenda-puxa-encomenda'
  | 'primeira-encomenda'
  | 'caderninho'

export interface Material {
  id: MaterialId
  titulo: string
  icone: string
  paginas: number
  /** rótulo na lista: "presente" para as Fichas, que vêm de graça com o kit */
  rotulo?: 'presente'
}

export const MATERIAIS: Record<MaterialId, Material> = {
  ebook: { id: 'ebook', titulo: 'Fábrica de Panetones Caseiros (100 receitas)', icone: '📕', paginas: 100 },
  'fichas-socorro': { id: 'fichas-socorro', titulo: 'SOS Massa: 20 Fichas de Socorro', icone: '🆘', paginas: 25, rotulo: 'presente' },
  b01: { id: 'b01', titulo: 'Bônus 01: Guia de Embalagem Que Vende', icone: '🎀', paginas: 13 },
  b02: { id: 'b02', titulo: 'Bônus 02: 20 Ideias de Kits de Natal', icone: '🧺', paginas: 24 },
  b03: { id: 'b03', titulo: 'Bônus 03: Cardápio de Natal para o WhatsApp', icone: '📸', paginas: 8 },
  b04: { id: 'b04', titulo: 'Bônus 04: Mensagens de Pré-venda e Encomenda', icone: '💬', paginas: 13 },
  'b05-guia': { id: 'b05-guia', titulo: 'Bônus 05: Planejador de Produção até 24/12', icone: '🗓️', paginas: 8 },
  'b05-imprimivel': { id: 'b05-imprimivel', titulo: 'Bônus 05: Planejador para imprimir', icone: '🖨️', paginas: 6 },
  b06: { id: 'b06', titulo: 'Bônus 06: Plano B Trufado Rápido', icone: '🍫', paginas: 10 },
  b07: { id: 'b07', titulo: 'Bônus 07: Tabela de Custo e Preço de Venda', icone: '🧮', paginas: 50 },
  b08: { id: 'b08', titulo: 'Bônus 08: +50 Receitas do Cardápio de Natal', icone: '🍪', paginas: 60 },
  recheios: { id: 'recheios', titulo: '10 Recheios que Mais Vendem', icone: '🥄', paginas: 13 },
  'encomenda-puxa-encomenda': { id: 'encomenda-puxa-encomenda', titulo: 'Encomenda Puxa Encomenda', icone: '🤝', paginas: 34 },
  'primeira-encomenda': { id: 'primeira-encomenda', titulo: 'A Primeira Encomenda', icone: '📦', paginas: 16 },
  caderninho: { id: 'caderninho', titulo: 'Caderninho de Clientes (para imprimir)', icone: '📒', paginas: 3 },
}

export interface Produto {
  id: ProdutoId
  nome: string
  precoCentavos: number
  libera: MaterialId[]
  /** links de pagamento na Wiapy (o botão da oferta abre este) */
  checkoutUrl: string
  /** ids que podem chegar em checkout.id no webhook (código público e id interno) */
  checkoutIds: string[]
}

export const PRODUTOS: Record<ProdutoId, Produto> = {
  kit: {
    id: 'kit',
    nome: 'Fábrica de Panetones Caseiros + 8 bônus',
    precoCentavos: 3790,
    libera: ['ebook', 'fichas-socorro', 'b01', 'b02', 'b03', 'b04', 'b05-guia', 'b05-imprimivel', 'b06', 'b07', 'b08'],
    checkoutUrl: 'https://pay.wiapy.com/r2PHgYwK6CVi',
    checkoutIds: ['r2PHgYwK6CVi', '6accaf7eb11ba1ecaf89b37e'],
  },
  recheios: {
    id: 'recheios',
    nome: '10 Recheios que Mais Vendem',
    precoCentavos: 790,
    libera: ['recheios'],
    // checkout avulso (para quem comprou o kit sem o bump); o mesmo produto também é o bump do kit
    checkoutUrl: 'https://pay.wiapy.com/lNDHn0qgGdy7',
    checkoutIds: ['lNDHn0qgGdy7', '6af0613b371815cbeca7ea24'],
  },
  encomenda: {
    id: 'encomenda',
    nome: 'Encomenda Puxa Encomenda',
    precoCentavos: 4700,
    libera: ['encomenda-puxa-encomenda', 'caderninho'],
    checkoutUrl: 'https://pay.wiapy.com/checkout/6aee79cc4fbe72f8a1685733',
    checkoutIds: ['6aee79cc4fbe72f8a1685733'],
  },
  primeira: {
    id: 'primeira',
    nome: 'A Primeira Encomenda',
    precoCentavos: 2700,
    libera: ['primeira-encomenda', 'caderninho'],
    checkoutUrl: 'https://pay.wiapy.com/checkout/6aee7b90371815cbec6a481c',
    checkoutIds: ['6aee7b90371815cbec6a481c'],
  },
  videoaulas: {
    id: 'videoaulas',
    nome: 'Videoaulas da Fábrica',
    precoCentavos: 1990,
    // as 25 aulas em vídeo (shared/aulas.ts). Não libera PDF: o acesso às aulas sai de ter este produto (src/aulas.ts, podeVerAulas).
    libera: [],
    // sem checkout ainda: o Levi decide. Com o link, preencher aqui e em VIDEOAULAS.checkoutUrl (src/telas/OfertaVideo.tsx), e os ids abaixo.
    checkoutUrl: '',
    checkoutIds: [],
  },
}

/** como reconhecer o bump dos Recheios dentro do pedido do kit */
export const BUMP_RECHEIOS = {
  ids: ['lNDHn0qgGdy7', '6af0613b371815cbeca7ea24'],
  trechosTitulo: ['recheio'],
  totalComKitCentavos: 3790 + 790,
}

export function materiaisLiberados(produtos: ProdutoId[]): MaterialId[] {
  const set = new Set<MaterialId>()
  for (const p of produtos) for (const m of PRODUTOS[p].libera) set.add(m)
  return Object.keys(MATERIAIS).filter((m) => set.has(m as MaterialId)) as MaterialId[]
}

export const ehMaterial = (x: string): x is MaterialId => Object.prototype.hasOwnProperty.call(MATERIAIS, x)
export const ehProduto = (x: string): x is ProdutoId => Object.prototype.hasOwnProperty.call(PRODUTOS, x)

/** WhatsApp de suporte: o Levi manda o número depois. Vazio = o app mostra só o texto "fale com o suporte". */
export const WHATSAPP_SUPORTE = ''
