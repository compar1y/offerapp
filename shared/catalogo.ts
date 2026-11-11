// Produtos, materiais e o que cada compra libera. Fonte única para o app (src/) e o servidor (api/, server/).
// Regra do Levi: tudo o que a cliente comprou fica ABERTO desde o primeiro minuto. Nada comprado é travado por progresso.

export type ProdutoId = 'kit' | 'recheios' | 'encomenda' | 'primeira' | 'videoaulas' | 'etiquetas' | 'contafeita'

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

/**
 * Imagens e Etiquetas com o Seu Nome (R$12,90): códigos da Wiapy (recebidos do Levi em 09/11).
 * checkoutUrl: o link de pagamento · checkoutIds: o código do link e o id interno do checkout · produtoIds: o id do conteúdo.
 * Com o checkoutUrl vazio, ofertaDisponivel() esconderia o card e a tela de venda.
 */
export const ETIQUETAS_WIAPY: { checkoutUrl: string; checkoutIds: string[]; produtoIds: string[] } = {
  checkoutUrl: 'https://pay.wiapy.com/6af20863371815cbecf6456a',
  checkoutIds: ['6af20863371815cbecf6456a'],
  produtoIds: ['6af207d3371815cbecf61968'],
}

/**
 * Respostas com a Conta Feita (R$9,90): códigos da Wiapy (recebidos do Levi em 10/11).
 * checkoutUrl: o link de pagamento · checkoutIds: o código do link · produtoIds: o id do conteúdo.
 * O webhook reconhece estes ids como 'contafeita' com a venda ligada ou desligada.
 */
export const CONTAFEITA_WIAPY: { checkoutUrl: string; checkoutIds: string[]; produtoIds: string[] } = {
  checkoutUrl: 'https://pay.wiapy.com/6af2a90804a3ce9b119ec3a8',
  checkoutIds: ['6af2a90804a3ce9b119ec3a8'],
  produtoIds: ['6af2a8a304a3ce9b119ebf8d'],
}

/**
 * CHAVE ÚNICA DA VENDA do Respostas com a Conta Feita.
 * true: o card da Coleção especial e a tela de oferta aparecem para quem não comprou.
 * false: nada da venda aparece para quem não comprou (quem já comprou continua com a ferramenta).
 */
export const CONTAFEITA_VENDA_LIGADA: boolean = true

/** a venda deste produto está ligada? (só o Conta Feita tem chave; os outros dependem só do checkout) */
export const vendaLigada = (p: ProdutoId, contafeitaLigada: boolean = CONTAFEITA_VENDA_LIGADA): boolean => p !== 'contafeita' || contafeitaLigada

export interface Produto {
  id: ProdutoId
  nome: string
  precoCentavos: number
  libera: MaterialId[]
  /** links de pagamento na Wiapy (o botão da oferta abre este) */
  checkoutUrl: string
  /** ids que podem chegar em checkout.id no webhook (código público e id interno). Reserva: só vale quando nenhum produto do pedido é reconhecido. */
  checkoutIds: string[]
  /** ids dos conteúdos na Wiapy (products[].id): é por eles que o webhook reconhece cada item do pedido */
  produtoIds?: string[]
}

export const PRODUTOS: Record<ProdutoId, Produto> = {
  kit: {
    id: 'kit',
    nome: 'Fábrica de Panetones Caseiros + 8 bônus',
    precoCentavos: 3790,
    libera: ['ebook', 'fichas-socorro', 'b01', 'b02', 'b03', 'b04', 'b05-guia', 'b05-imprimivel', 'b06', 'b07', 'b08'],
    // checkout NOVO do app (10/11, página de vendas): o8Euxe-W2nPN / 6af307cb…; os antigos continuam reconhecidos
    checkoutUrl: 'https://pay.wiapy.com/o8Euxe-W2nPN',
    checkoutIds: ['r2PHgYwK6CVi', '6accaf7eb11ba1ecaf89b37e', 'o8Euxe-W2nPN', '6af307cb04a3ce9b11a7ea9c'],
    // conteúdos do kit na Wiapy: E-book (pedido real) e o produto Externo 'Minha Fornada de Natal – Kit Fábrica de Panetones Caseiros' (6af2fd6b…)
    produtoIds: ['6accab07c8bdfc2949d11bc6', '6accb04f9b597b6a2bd6a0f1', '6af2fd6b371815cbec19ef04'],
  },
  recheios: {
    id: 'recheios',
    nome: '10 Recheios que Mais Vendem',
    precoCentavos: 790,
    libera: ['recheios'],
    // checkout avulso (para quem comprou o kit sem o bump); o mesmo produto também é o bump do kit
    checkoutUrl: 'https://pay.wiapy.com/lNDHn0qgGdy7',
    checkoutIds: ['lNDHn0qgGdy7', '6af0613b371815cbeca7ea24'],
    produtoIds: ['6ae587c02da3da6ee2a9dcbc'],
  },
  encomenda: {
    id: 'encomenda',
    nome: 'Encomenda Puxa Encomenda',
    precoCentavos: 4700,
    libera: ['encomenda-puxa-encomenda', 'caderninho'],
    checkoutUrl: 'https://pay.wiapy.com/checkout/6aee79cc4fbe72f8a1685733',
    checkoutIds: ['6aee79cc4fbe72f8a1685733'],
    // conteúdo antigo e o novo "Encomenda App"
    produtoIds: ['6aee7888b7632434c318aaa4', '6af1f38f371815cbecf1c105'],
  },
  primeira: {
    id: 'primeira',
    nome: 'A Primeira Encomenda',
    precoCentavos: 2700,
    libera: ['primeira-encomenda', 'caderninho'],
    checkoutUrl: 'https://pay.wiapy.com/checkout/6aee7b90371815cbec6a481c',
    checkoutIds: ['6aee7b90371815cbec6a481c'],
    // conteúdo antigo e o novo "Primeira App"
    produtoIds: ['6aee7b444fbe72f8a1689b1f', '6af1f3ee04a3ce9b117a12fb'],
  },
  videoaulas: {
    id: 'videoaulas',
    nome: 'Videoaulas da Fábrica',
    precoCentavos: 1990,
    // as 25 aulas em vídeo (shared/aulas.ts). Não libera PDF: o acesso às aulas sai de ter este produto (src/aulas.ts, podeVerAulas).
    libera: [],
    // "Aulas em Vídeo: Panetone e Chocotone Passo a Passo" na Wiapy (decisão do Levi, 09/11)
    checkoutUrl: 'https://pay.wiapy.com/6af1e13a04a3ce9b11749472',
    checkoutIds: ['6af1e13a04a3ce9b11749472'],
    produtoIds: ['6af1e083371815cbecec6d54'],
  },
  etiquetas: {
    id: 'etiquetas',
    nome: 'Imagens e Etiquetas com o Seu Nome',
    precoCentavos: 1290,
    // não é PDF pronto: o app gera as 6 imagens e o PDF de etiquetas com o nome dela (src/telas/Etiquetas.tsx)
    libera: [],
    checkoutUrl: ETIQUETAS_WIAPY.checkoutUrl,
    checkoutIds: ETIQUETAS_WIAPY.checkoutIds,
    produtoIds: ETIQUETAS_WIAPY.produtoIds,
  },
  contafeita: {
    id: 'contafeita',
    nome: 'Respostas com a Conta Feita',
    precoCentavos: 990,
    // ferramenta dentro do app (src/telas/ContaFeita.tsx): não libera PDF nem aulas
    libera: [],
    checkoutUrl: CONTAFEITA_WIAPY.checkoutUrl,
    checkoutIds: CONTAFEITA_WIAPY.checkoutIds,
    produtoIds: CONTAFEITA_WIAPY.produtoIds,
  },
}

/** como reconhecer o bump dos Recheios dentro do pedido do kit */
export const BUMP_RECHEIOS = {
  // 6ae58834…: id do bump no pedido real do kit
  ids: ['lNDHn0qgGdy7', '6af0613b371815cbeca7ea24', '6ae58834a57aeb7e182e52ba'],
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
export const WHATSAPP_SUPORTE = '5511941926165' // +55 11 94192-6165 (oficial, Levi 10/11)
export const MENSAGEM_SUPORTE = 'Oi! Comprei o Kit Fábrica de Panetones e preciso de ajuda.'
/** link do WhatsApp de suporte com a mensagem pronta: o mesmo em todo lugar do app */
export const LINK_SUPORTE = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(MENSAGEM_SUPORTE)}`
