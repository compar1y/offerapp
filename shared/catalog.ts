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
  | 'ano-inteiro-encomendas'
  | 'panetones-vulcao'
  | 'panetones-vitrine'
  | 'segredo-recheios'
  | 'sobremesas-natal'
  | 'mini-panetones'
  | 'receitas-explodir-vendas'
  | 'natal-criancas'
  | 'janeiro-panetone'
  | 'ponto-perfeito'
  | 'panetones-premium'
  | 'caixas-doces-natal'
  | 'ceia-doce'
  | 'rabanada-padaria'
  | 'doces-para-revender'
  | 'cesta-natal-caseira'
  | 'biscoitos-natal-decorados'
  | 'dia-producao-escala'
  | 'mesa-doce-ano-novo'
  | 'chocotone-colher'

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
// Para incluir um produto novo no catálogo: 1) acrescente o id em ItemId (lista acima), 2) acrescente o objeto em OFFERS (copie um existente).
export type OfferId = Exclude<ItemId, 'main' | 'bump' | `bonus-${string}`>
export type OfferKind = 'upsell' | 'downsell' | 'seasonal'
export type OfferPlacement =
  | 'home-banner' // banner na home (imagem em cima, informação embaixo)
  | 'item-footer' // rodapé da página de uma receita/bônus, depois de o cliente marcar "Fiz essa"
  | 'home-card' // card com cadeado e mockup entre os cards da home

export type DeliverableIcon = 'book' | 'cards' | 'print' | 'sheet' | 'menu' | 'calendar' | 'video' | 'art' | 'kit'

// depoimento REAL de cliente (só preencher com autorização). Vazio por padrão: a seção "O que dizem os clientes" só aparece com itens.
export interface Testimonial {
  name: string
  text: string
}

export interface BonusItem {
  title: string
  // tipo de arquivo, mostrado no card (ex.: "planilha", "imprimível")
  fileType: string
  icon: DeliverableIcon
  valueCents: number
}

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
  // aparece na página /catalogo (e na bolinha de novidades), quando CATALOG_ENABLED estiver ligado
  catalog: boolean
  // 'available' = tem checkout e o botão compra; 'soon' = em breve, o botão vira "Quero ser avisada" (grava offer.interest)
  status: 'available' | 'soon'
  // selo "Destaque" e primeira posição no catálogo (escolha editorial, não é escassez)
  // formato do que o cliente recebe (rótulo curto no card, para não parecer que tudo é PDF) e o ícone funcional do chip
  deliverableType: string
  deliverableIcon: DeliverableIcon
  // o que o mockup do catálogo mostra (briefing da imagem) e a proporção do arquivo: vertical 640x960 (padrão) ou horizontal 800x600 (rabanada, dia de produção, ponto perfeito)
  // o arquivo fica em public/img/catalogo/<id>.webp (fundo transparente); ver README
  imageType: string
  imageRatio: '2:3' | '4:3'
  // pilha de valor (só no top 10): passo a passo, antes/depois (descritivo, sem número de ganho), 3 bônus e o valor somado dos itens
  // o valor somado (offerValueFromCents) = preço do produto + valor de cada bônus, calculado, nunca digitado.
  // Rótulo na tela: "valor somado dos itens". Nunca "preço antigo", nunca relógio ou escassez.
  // bullets de copy do card (curiosidade + benefício concreto + resultado prático; sem ganho, sem escassez)
  bullets?: string[]
  // depoimentos reais (vazio = seção escondida). Nunca inventar.
  testimonials: Testimonial[]
  stack?: { steps: string[]; before: string; after: string }
  bonus?: BonusItem[]
  featured: boolean
  // top 10 da lista fechada (ver OFERTAS-30-TIER-S.md): aparecem antes das demais
  tierS: boolean
  // true = mostra "NOVO" e conta na bolinha vermelha até a cliente abrir o catálogo
  badgeNew: boolean
  // título de impacto do card (sem promessa de renda, sem número de ganho)
  headline: string
  // promessa curta do card (1 frase, sem renda numérica)
  promise: string
  // arquivo do mockup em public/img (PNG/WebP com fundo transparente, 533x800). null = ainda não existe (ver IMAGENS-FALTANDO.md)
  cover: string | null
  files: FileEntry[]
}

export const OFFERS: Offer[] = [
  {
    id: 'panetones-vulcao',
    kind: 'upsell',
    enabled: true,
    title: 'Panetones Vulcão: 15 Receitas de Dar Água na Boca',
    subtitle: 'Panetones com cobertura e recheio escorrendo',
    description: 'Panetones com cobertura e recheio escorrendo, de apelo visual imediato. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 40 páginas', '15 combinações', 'Técnicas de montagem, caldas e controle de consistência', 'Instruções de apresentação'],
    priceCents: 2790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['vulcão'],
    catalog: true,
    status: 'soon',
    badgeNew: true,
    headline: 'Panetones Vulcão: o recheio que escorre e vende pelos olhos',
    promise: '15 combinações de cobertura e recheio escorrendo, com técnica de montagem.',
    deliverableType: 'Caderno de receitas',
    deliverableIcon: 'book',
    imageType: 'Caderno/livro 3D aberto com foto de panetone vulcão',
    imageRatio: '2:3',
    bullets: [
      'Por que o recheio "transborda" e não escorre: a regra de firmeza que muda tudo.',
      '15 receitas de vulcão, do clássico ao ousado, com medidas por fôrma.',
      'O corte que faz o recheio aparecer no primeiro pedaço (a cena que dá vontade).',
      'Como rechear sem a massa encharcar nem rasgar.',
      'Passo a passo com fotos, pronto para seguir na bancada.',
      'Tabela de rendimento para saber quanto recheio usar em cada tamanho.',
      'Cartões de foto para registrar o resultado com cara de confeitaria.',
    ],
    stack: { steps: ['Escolha a receita', 'Monte o recheio', 'Finalize o "vulcão"', 'Fotografe'], before: 'Panetone comum', after: 'Panetone que parece de confeitaria' },
    bonus: [
      { title: 'Tabela de Rendimento de Recheios por Fôrma', fileType: 'planilha', icon: 'sheet', valueCents: 1200 },
      { title: 'Cartões de Foto do Vulcão (6 ângulos)', fileType: 'imprimível', icon: 'print', valueCents: 990 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'panetones-vitrine',
    kind: 'upsell',
    enabled: true,
    title: 'Panetones de Vitrine: 25 Acabamentos de Luxo + Fotos que Dão Vontade',
    subtitle: '25 acabamentos e como fotografar com o celular',
    description: 'Técnicas para finalizar o panetone com cara de confeitaria e um guia para fotografá-lo com o celular na vitrine e na divulgação. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 50 páginas', '25 técnicas de decoração e combinações de cores', 'Guia de fotos com o celular: composições, cenários caseiros e luz'],
    priceCents: 2790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['vitrine'],
    catalog: true,
    status: 'soon',
    badgeNew: true,
    headline: '25 acabamentos de luxo e fotos que dão vontade: seu panetone de vitrine',
    promise: 'Acabamentos para o panetone parecer de confeitaria e um guia para fotografar com o celular.',
    deliverableType: 'Cartões de acabamento',
    deliverableIcon: 'cards',
    imageType: 'Cartões de acabamento espalhados + celular fotografando um panetone',
    imageRatio: '2:3',
    bullets: [
      '25 acabamentos para o mesmo panetone parecer de vitrine, sem equipamento caro.',
      'O detalhe de cobertura que faz um panetone simples parecer premium.',
      'Como fotografar com o celular sem estúdio, usando a luz da janela.',
      'Cenários e fundos prontos para a foto ficar bonita em 2 minutos.',
      'Pôster de bancada com os 25 acabamentos para consultar enquanto decora.',
      'Checklist de foto: ângulo, luz e fundo, na ordem certa.',
    ],
    stack: { steps: ['Escolha o acabamento', 'Aplique a cobertura', 'Monte o cenário', 'Fotografe'], before: 'Panetone simples', after: 'Vitrine pronta para postar' },
    bonus: [
      { title: 'Pôster de Bancada dos 25 Acabamentos (A3)', fileType: 'imprimível', icon: 'print', valueCents: 1200 },
      { title: 'Checklist de Foto com Celular', fileType: 'imprimível', icon: 'print', valueCents: 700 },
      { title: 'Fundos e Cenários Prontos para Foto', fileType: 'imagens JPG', icon: 'art', valueCents: 1490 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'caixas-doces-natal',
    kind: 'upsell',
    enabled: true,
    title: 'Caixas de Doces de Natal: 30 brigadeiros e trufas gourmet que viram presente',
    subtitle: '30 brigadeiros e trufas para montar caixas de presente',
    description: 'Brigadeiros gourmet, trufas e bombons de colher, com a montagem de caixas de presente. Não leva fermentação. É uma compra à parte, ainda em preparação.',
    includes: ['30 receitas de brigadeiro gourmet, trufa e bombom de colher', 'Montagem de caixas de 4, 6, 9 e 12', 'Rendimento por receita, validade e conservação', 'Lista de compras e custo por caixa'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['caixas de doces de natal'],
    catalog: true,
    status: 'soon',
    badgeNew: true,
    headline: 'Caixas de Doces de Natal: 30 brigadeiros e trufas que viram presente',
    promise: '30 receitas e a montagem de caixas para acompanhar o panetone na mesma encomenda.',
    deliverableType: 'Pasta de imprimíveis',
    deliverableIcon: 'print',
    imageType: 'Caixa 3D aberta com doces + pasta de imprimíveis ao lado',
    imageRatio: '2:3',
    bullets: [
      '30 brigadeiros e trufas gourmet que combinam entre si na mesma caixa.',
      'A montagem que faz uma caixa simples parecer presente de loja.',
      'Moldes de caixa para recortar em 3 medidas, prontos para imprimir.',
      'Como calcular quantos doces cabem em cada caixa sem sobrar nem faltar.',
      'Receitas-base que rendem vários sabores com uma massa só.',
      'Tabela de quantidades para pedidos de 10, 20 e 50 caixas.',
      'Dicas de conservação para a caixa chegar perfeita na entrega.',
    ],
    stack: { steps: ['Faça a massa-base', 'Enrole e decore', 'Recorte e monte a caixa', 'Coloque a tag'], before: 'Doces soltos', after: 'Caixa de presente com cara de loja' },
    bonus: [
      { title: 'Moldes de Caixa de Presente para Doces (3 medidas)', fileType: 'imprimível para recortar', icon: 'print', valueCents: 1990 },
      { title: 'Tabela de Quantidades por Pedido: 10, 20 e 50 caixas', fileType: 'imprimível', icon: 'sheet', valueCents: 1200 },
    ],
    testimonials: [],
    featured: true,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'segredo-recheios',
    kind: 'upsell',
    enabled: true,
    title: 'O Segredo dos Recheios que Fazem Qualquer Panetone Parecer de Confeitaria',
    subtitle: 'Recheios e técnicas para elevar a massa simples',
    description: 'Recheios para transformar uma massa simples em um produto mais elaborado. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 40 páginas', '20 recheios', '5 técnicas de aplicação', 'Quantidades por tamanho, combinações e conservação'],
    priceCents: 3790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['recheios'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'O segredo dos recheios que dão cara de confeitaria ao panetone',
    promise: '20 recheios, técnicas de aplicação e quantidades por tamanho.',
    deliverableType: 'Fichário de receitas',
    deliverableIcon: 'cards',
    imageType: 'Fichário com cartões de receita e pôster "mapa de recheios" na parede',
    imageRatio: '2:3',
    bullets: [
      'As 5 técnicas por trás de qualquer recheio cremoso e estável.',
      'Por que alguns recheios desandam e como salvar na hora (guia SOS).',
      '20 recheios que combinam com panetone, do tradicional ao gourmet.',
      'Como acertar a textura: nem líquido que escorre, nem duro que racha.',
      'Mapa de recheios para escolher a combinação certa em segundos.',
      'Cartões por técnica para consultar sem reler o guia inteiro.',
    ],
    stack: { steps: ['Escolha a base', 'Aplique a técnica', 'Acerte a textura', 'Combine com o panetone'], before: 'Recheio escorrendo ou seco', after: 'Recheio cremoso e estável' },
    bonus: [
      { title: 'Pôster Mapa de Recheios', fileType: 'imprimível', icon: 'print', valueCents: 1200 },
      { title: 'Guia SOS de Textura', fileType: 'PDF curto', icon: 'book', valueCents: 990 },
      { title: 'Combinações Panetone x Recheio', fileType: 'checklist', icon: 'print', valueCents: 700 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'receitas-explodir-vendas',
    kind: 'upsell',
    enabled: true,
    title: '15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro',
    subtitle: '15 receitas de sabores e apresentações para o Natal',
    description: 'Uma coleção de 15 receitas temáticas de panetone, com sabores e apresentações diferentes das 100 receitas do seu kit. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de 45 a 55 páginas', '15 receitas temáticas', 'Fotos de corte, ingredientes, rendimento e montagem'],
    priceCents: 4700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['vão explodir'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: '15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro',
    promise: 'Uma coleção de 15 sabores e apresentações para o seu cardápio de fim de ano.',
    deliverableType: 'Planilha interativa',
    deliverableIcon: 'sheet',
    imageType: 'Tablet mostrando a planilha com o caderno de receitas ao lado',
    imageRatio: '2:3',
    bullets: [
      '15 receitas escolhidas pelo que as pessoas mais procuram na época do Natal.',
      'Ranking por rendimento e tempo: veja qual compensa produzir primeiro.',
      'A lógica de escolher receitas que se vendem sozinhas pelo visual.',
      'Fotos de cada receita para você saber exatamente o resultado.',
      'Lista de compras semanal para não esquecer nada na produção.',
      'Receitas diferentes das 100 originais, para quem já fez e quer variar.',
      'Pensado para quem quer se organizar para as encomendas de dezembro.',
    ],
    stack: { steps: ['Escolha as receitas da semana', 'Calcule o custo na planilha', 'Planeje a produção', 'Divulgue'], before: 'Sem plano para dezembro', after: 'Agenda de produção e preço definidos' },
    bonus: [
      { title: 'Ranking das 15 por Rendimento e Tempo', fileType: 'planilha interativa', icon: 'sheet', valueCents: 1990 },
      { title: 'Cartões de Foto de Cada Receita', fileType: 'imprimível', icon: 'cards', valueCents: 1200 },
      { title: 'Lista de Compras da Semana', fileType: 'checklist', icon: 'print', valueCents: 700 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'sobremesas-natal',
    kind: 'upsell',
    enabled: true,
    title: '20 Sobremesas de Natal com Panetone',
    subtitle: '20 sobremesas de Natal com panetone',
    description: 'Ideias do que fazer com o panetone na ceia: tiramisù, pavê, rabanada recheada, taças e pudim. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 60 páginas', '20 receitas com rendimento e montagem', 'Versões em travessa, em camadas, com conservação'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['sobremesas de natal'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: '20 sobremesas de Natal para fazer com panetone, até na travessa',
    promise: 'Tiramisù, pavê, rabanada recheada, taças e sobremesas cremosas em travessa.',
    deliverableType: 'Cardápio imprimível',
    deliverableIcon: 'menu',
    imageType: 'Cardápio em pé / revista aberta com sobremesas',
    imageRatio: '2:3',
    bullets: [
      '20 sobremesas que transformam panetone em prato de ceia e de travessa.',
      'O que fazer com o panetone que sobra, sem ficar seco nem enjoar.',
      'Montagem em taça e em travessa, com medidas para a mesa da família.',
      'Camadas cremosas com poucos ingredientes e muito efeito.',
      'Cartão de menu só de sobremesas para deixar a mesa com cara de buffet.',
      'Receitas que podem ser feitas na véspera e aguentam na geladeira.',
    ],
    stack: { steps: ['Escolha a sobremesa', 'Monte as camadas', 'Leve para gelar', 'Sirva'], before: 'Panetone que sobra', after: 'Sobremesa de ceia' },
    bonus: [
      { title: 'Cartão de Menu só de Sobremesas (A5 editável)', fileType: 'imprimível editável', icon: 'menu', valueCents: 990 },
      { title: 'Guia de Montagem em Taça e Travessa', fileType: 'PDF', icon: 'book', valueCents: 1200 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'ceia-doce',
    kind: 'upsell',
    enabled: true,
    title: 'Ceia Doce: 25 sobremesas de Natal e Ano Novo, sem panetone',
    subtitle: 'Pavês, tortas geladas, mousses, bolos no pote e taças',
    description: 'Sobremesas para a ceia, em travessa e individuais: pavês, tortas geladas, mousses, panna cotta, bolos no pote e taças. Sem panetone. É uma compra à parte, ainda em preparação.',
    includes: ['PDF com 25 receitas', 'Versões em travessa e individuais (pote e taça)', 'Cronograma de 3 dias antes da ceia'],
    priceCents: 2700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['ceia doce'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Ceia Doce: 25 sobremesas de Natal e Ano Novo sem complicação',
    promise: '25 sobremesas em travessa, no pote e em taça, com cronograma de 3 dias antes da ceia.',
    deliverableType: 'Calendário de parede',
    deliverableIcon: 'calendar',
    imageType: 'Pôster/calendário de parede da ceia + checklist em prancheta',
    imageRatio: '2:3',
    bullets: [
      '25 sobremesas sem panetone para completar a mesa de Natal e de Ano Novo.',
      'Cronograma de 3 dias para não ficar na cozinha na noite da ceia.',
      'Bolo no pote, taças e tortas geladas no mesmo guia.',
      'Lista de compras organizada por corredor do mercado.',
      'Checklist de bancada para saber o que fazer primeiro.',
      'Calendário de parede para colar na cozinha e riscar o que já fez.',
    ],
    stack: { steps: ['Escolha 5 sobremesas', 'Siga o cronograma', 'Monte a mesa'], before: 'Correria na véspera', after: 'Ceia doce pronta com antecedência' },
    bonus: [
      { title: 'Calendário de Parede da Ceia (3 dias, A3)', fileType: 'imprimível', icon: 'calendar', valueCents: 1200 },
      { title: 'Checklist de Bancada', fileType: 'imprimível', icon: 'print', valueCents: 700 },
      { title: 'Lista de Compras da Ceia por corredor do mercado', fileType: 'checklist', icon: 'print', valueCents: 700 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'mini-panetones',
    kind: 'upsell',
    enabled: true,
    title: 'Mini Panetones: Pequenos no Tamanho, Gigantes no Desejo',
    subtitle: 'Modelos de mini panetones para presentear e vender',
    description: 'Mini panetones para lembrancinhas, presentes e encomendas individuais. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 45 páginas', '20 modelos', 'Pesos, medidas e rendimentos', 'Técnicas de recheio'],
    priceCents: 2790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['mini panetones'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Mini Panetones: pequenos no tamanho, gigantes no desejo',
    promise: 'Lembrancinhas, presentes e encomendas individuais.',
    deliverableType: 'Kit de moldes para recortar',
    deliverableIcon: 'print',
    imageType: 'Caixinha 3D de mini panetones + fichas de rendimento',
    imageRatio: '2:3',
    bullets: [
      '20 modelos de mini panetone para dar de presente ou vender em unidade.',
      'Como ajustar tempo e fôrma para cada tamanho sem queimar nem ficar cru.',
      'Moldes de caixinha para recortar e embalar cada unidade.',
      'Fichas de rendimento: quantas unidades sai de cada receita.',
      'Etiquetas prontas para identificar sabor e validade.',
      'Ideias de combinação para montar kits de 3, 6 e 12 minis.',
    ],
    stack: { steps: ['Escolha o tamanho', 'Asse', 'Embale', 'Etiquete'], before: 'Um panetone grande', after: 'Várias unidades prontas para presente' },
    bonus: [
      { title: 'Moldes de Caixinha Mini + Etiquetas', fileType: 'imprimível para recortar', icon: 'print', valueCents: 1490 },
      { title: 'Fichas de Rendimento por Tamanho', fileType: 'imprimível', icon: 'cards', valueCents: 990 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'rabanada-padaria',
    kind: 'upsell',
    enabled: true,
    title: 'Rabanada de Padaria: 12 versões',
    subtitle: '12 versões da rabanada de Natal',
    description: 'Doze versões da rabanada de Natal, com recheios e coberturas. É uma compra à parte, ainda em preparação.',
    includes: ['PDF com 12 versões', 'Recheios e coberturas', 'Rendimento e conservação'],
    priceCents: 2490,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['rabanada de padaria'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Rabanada de Padaria: 12 versões que dão vontade',
    promise: '12 versões da rabanada, com recheios e coberturas.',
    deliverableType: 'Vídeo-aulas',
    deliverableIcon: 'video',
    imageType: 'Tablet/celular com player de vídeo e prato de rabanada',
    imageRatio: '4:3',
    bullets: [
      'O truque do pão e do banho que deixa a rabanada cremosa por dentro e dourada por fora.',
      '12 versões: tradicional, recheada, de forno e com cobertura.',
      'Como fazer sem encharcar de óleo (e sem ficar murcha).',
      '3 vídeo-aulas curtas para ver o ponto certo em 1 a 2 minutos cada.',
      'Guia de caldas e coberturas para trocar o sabor sem trocar a receita.',
      'Cartões de receita para consultar na hora.',
    ],
    stack: { steps: ['Prepare o pão', 'Banho e fritura ou forno', 'Finalize com calda'], before: 'Rabanada murcha', after: 'Rabanada dourada e cremosa' },
    bonus: [
      { title: 'Guia de Caldas e Coberturas', fileType: 'PDF', icon: 'book', valueCents: 990 },
      { title: 'Dicas para Não Encharcar (1 min)', fileType: 'vídeo curto', icon: 'video', valueCents: 990 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'doces-para-revender',
    kind: 'upsell',
    enabled: true,
    title: 'Doces de Natal para Revender: pacote Caixas + Lembrancinhas',
    subtitle: 'Pacote com Caixas de Doces e Lembrancinhas em Potinhos',
    description: 'Um pacote para vender doces de Natal junto com o panetone: caixas de presente e lembrancinhas em potinhos, com rendimento por receita e como embalar e organizar a encomenda. É uma compra à parte, ainda em preparação.',
    includes: ['Pacote: Caixas de Doces + Lembrancinhas em Potinhos', 'Como embalar, rendimento por receita e custo', 'Passos para organizar uma encomenda'],
    priceCents: 4700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['doces de natal para revender'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Doces de Natal para Revender: Caixas + Lembrancinhas',
    promise: 'Pacote para quem quer vender doces junto com o panetone: receitas, embalagem e rendimento.',
    deliverableType: 'Kit de artes editáveis',
    deliverableIcon: 'art',
    imageType: 'Celular com arte de promoção + notebook/tablet com o kit',
    imageRatio: '2:3',
    bullets: [
      'Pacote para montar caixas e lembrancinhas de Natal prontas para oferecer.',
      '15 artes editáveis para Stories e Feed, só trocar o nome e o preço.',
      'Textos curtos prontos para descrever cada caixa no Instagram.',
      'Tabela de quantidades para pedidos de 10, 20 e 50 lembrancinhas.',
      'O passo a passo de montar a caixa e entregar com aparência de loja.',
      'Receitas de lembrancinhas em potinhos que rendem bastante com pouco custo.',
    ],
    stack: { steps: ['Escolha os doces', 'Defina o preço na planilha', 'Publique a arte', 'Responda com o script'], before: 'Doces sem divulgação', after: 'Pacote pronto e divulgado' },
    bonus: [
      { title: 'Kit de 15 Artes Editáveis para Stories e Feed', fileType: 'artes editáveis', icon: 'art', valueCents: 1990 },
      { title: 'Textos de Descrição das Caixas para Instagram', fileType: 'textos curtos', icon: 'menu', valueCents: 1200 },
      { title: 'Tabela de Quantidades por Pedido: 10, 20 e 50 lembrancinhas', fileType: 'imprimível', icon: 'sheet', valueCents: 1200 },
    ],
    testimonials: [],
    featured: false,
    tierS: true,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'cesta-natal-caseira',
    kind: 'upsell',
    enabled: true,
    title: 'Kit de Presente Gourmet: Cesta de Natal Caseira',
    subtitle: 'Presentes comestíveis para montar em casa',
    description: 'Receitas e modelos de cesta de Natal com itens feitos em casa. Complementa, sem repetir, o Bônus 02 (20 Ideias de Kits de Natal). É uma compra à parte, ainda em preparação.',
    includes: ['5 modelos de cesta com lista de itens', 'Receitas dos itens feitos em casa', 'Como montar e embalar'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['cesta de natal caseira'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Cesta de Natal Caseira: presentes comestíveis montados do zero',
    promise: 'Receitas e 5 modelos de cesta com lista do que vai em cada uma e como embalar.',
    deliverableType: 'Pasta de imprimíveis',
    deliverableIcon: 'print',
    imageType: 'Cesta de Natal montada + pasta de imprimíveis (tags e etiquetas)',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'biscoitos-natal-decorados',
    kind: 'upsell',
    enabled: true,
    title: 'Biscoitos de Natal Decorados: do cortador ao saquinho',
    subtitle: '15 modelos de biscoito decorado',
    description: 'Massa amanteigada que mantém a forma no forno, glacê e 15 modelos de biscoito de Natal, com passo a passo. É uma compra à parte, ainda em preparação.',
    includes: ['15 modelos', 'Massa amanteigada e glacê', 'Passo a passo e embalagem em saquinho'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['biscoitos de natal decorados'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Biscoitos de Natal Decorados: do cortador ao saquinho',
    promise: 'Massa que não deforma no forno, glacê e 15 modelos, com passo a passo.',
    deliverableType: 'Fichas de receita',
    deliverableIcon: 'cards',
    imageType: 'Biscoitos decorados + fichas de receita e moldes',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'dia-producao-escala',
    kind: 'upsell',
    enabled: true,
    title: 'Dia de Produção em Escala: planilha e passo a passo',
    subtitle: 'Planilha e roteiro para produzir mais de uma vez',
    description: 'Uma planilha e um roteiro para organizar um dia de produção com várias encomendas. É uma compra à parte, ainda em preparação.',
    includes: ['Planilha de produção', 'Passo a passo do dia', 'Checklist de compras e horários'],
    priceCents: 3700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['dia de produção em escala'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Dia de Produção em Escala: faça várias encomendas num só dia',
    promise: 'Planilha e passo a passo para organizar uma fornada maior sem se perder.',
    deliverableType: 'Planilha interativa',
    deliverableIcon: 'sheet',
    imageType: 'Tablet mostrando a planilha de produção ao lado de uma prancheta',
    imageRatio: '4:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'mesa-doce-ano-novo',
    kind: 'upsell',
    enabled: true,
    title: 'Mesa Doce de Ano Novo: sobremesas para a virada',
    subtitle: 'Sobremesas de Ano Novo',
    description: 'Sobremesas para a mesa doce da virada do ano, para servir e para encomendas. É uma compra à parte, ainda em preparação.',
    includes: ['Receitas de sobremesas de Ano Novo', 'Montagem da mesa doce', 'Rendimento e conservação'],
    priceCents: 2700,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['mesa doce de ano novo'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Mesa Doce de Ano Novo: sobremesas para a virada',
    promise: 'Sobremesas para a mesa de Ano Novo, para servir e para encomenda.',
    deliverableType: 'Cardápio imprimível',
    deliverableIcon: 'menu',
    imageType: 'Cardápio de mesa doce em pé com sobremesas ao fundo',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'chocotone-colher',
    kind: 'upsell',
    enabled: true,
    title: 'Chocotone e Panetone de Colher: 12 sobremesas instantâneas',
    subtitle: '12 sobremesas de colher com panetone',
    description: 'Doze sobremesas de colher feitas com panetone ou chocotone, de preparo rápido. É uma compra à parte, ainda em preparação.',
    includes: ['12 receitas de colher', 'Rendimento e conservação'],
    priceCents: 2490,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['panetone de colher'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Chocotone e Panetone de Colher: 12 sobremesas rápidas',
    promise: '12 sobremesas de colher feitas com panetone e chocotone, sem forno.',
    deliverableType: 'Cartões de receita',
    deliverableIcon: 'cards',
    imageType: 'Taça de sobremesa de colher + cartões de receita',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'natal-criancas',
    kind: 'upsell',
    enabled: true,
    title: 'Natal das Crianças: 20 Panetones que Viram Presentes Irresistíveis',
    subtitle: '20 modelos de panetone para as crianças',
    description: 'Panetones temáticos para presentear, com decoração comestível. Compra sazonal, à parte, ainda em preparação.',
    includes: ['PDF de cerca de 40 páginas', '20 modelos', 'Decoração comestível, ingredientes e montagem'],
    priceCents: 2490,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['natal das crianças'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Natal das Crianças: 20 panetones que viram presentes',
    promise: 'Panetones temáticos para presentear, com decoração comestível.',
    deliverableType: 'Caderno de receitas',
    deliverableIcon: 'book',
    imageType: 'Caderno/livro 3D aberto com panetones de presente para crianças',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'janeiro-panetone',
    kind: 'upsell',
    enabled: true,
    title: 'Janeiro Também Tem Panetone: 15 Sabores para Além do Natal',
    subtitle: '15 sabores para vender fora do Natal',
    description: 'Receitas de panetone para o café da tarde, sobremesas e apresentações sem tema natalino. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 45 páginas', '15 receitas', 'Apresentações sem tema natalino'],
    priceCents: 2790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['janeiro também'],
    catalog: true,
    status: 'soon',
    badgeNew: false,
    headline: 'Janeiro também tem panetone: 15 sabores para além do Natal',
    promise: 'Receitas para vender depois do Natal, sem tema natalino.',
    deliverableType: 'Caderno de receitas',
    deliverableIcon: 'book',
    imageType: 'Caderno/livro 3D aberto com panetone de janeiro',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'panetones-premium',
    kind: 'upsell',
    enabled: false,
    title: 'Panetones Premium: A Coleção de Alto Padrão para Encomendas Especiais',
    subtitle: '12 receitas premium para encomendas especiais',
    description: 'Uma linha de maior valor percebido, para encomendas especiais. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 65 páginas', '12 receitas premium', 'Ingredientes especiais, montagem e acabamento'],
    priceCents: 4790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['panetones premium'],
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'Panetones Premium: a coleção de alto padrão para encomendas especiais',
    promise: '12 receitas premium com ingredientes especiais e acabamento.',
    deliverableType: 'Caderno de receitas',
    deliverableIcon: 'book',
    imageType: 'Caderno/livro 3D com panetone premium',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
  {
    id: 'ponto-perfeito',
    kind: 'upsell',
    enabled: false,
    title: 'O Ponto Perfeito: Domine a Massa do Panetone Sem Adivinhação',
    subtitle: 'Massa, fermentação e forno com comparações visuais',
    description: 'Um mini-curso em PDF sobre massa, fermentação e forno. Ensina a prevenir os problemas; as Fichas de Socorro ensinam a diagnosticar. É uma compra à parte, ainda em preparação.',
    includes: ['PDF de cerca de 50 páginas', '30 comparações técnicas e testes'],
    priceCents: 3790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['ponto perfeito'],
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'O ponto perfeito: domine a massa do panetone sem adivinhação',
    promise: 'Mini-curso em PDF sobre massa, fermentação e forno, com comparações visuais.',
    deliverableType: 'Vídeo-aulas',
    deliverableIcon: 'video',
    imageType: 'Tablet com player de vídeo da massa',
    imageRatio: '4:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
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
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'A próxima fornada: a de Páscoa',
    promise: 'Material sazonal para a fornada de Páscoa, ainda em preparação.',
    deliverableType: 'Pasta de imprimíveis',
    deliverableIcon: 'print',
    imageType: 'Ovo de colher + pasta de imprimíveis de Páscoa',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: ['home-card'],
    cover: null,
    files: [],
  },
  {
    id: 'ano-inteiro-encomendas',
    kind: 'upsell',
    enabled: false,
    title: 'Ano Inteiro de Encomendas',
    subtitle: 'Calendário de datas para vender além do Natal',
    description: 'Um calendário com as datas do ano em que dá para oferecer doces e panetones por encomenda, com ideias do que preparar em cada uma. Compra à parte, ainda em preparação.',
    includes: [],
    priceCents: 3790,
    checkoutUrl: '',
    wiapyProductId: '',
    titleHints: ['ano inteiro de encomendas'],
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'Venda o ano todo, não só em dezembro',
    promise: 'Calendário de datas e ideias do que oferecer em cada uma.',
    deliverableType: 'Pacote completo',
    deliverableIcon: 'kit',
    imageType: 'Pilha de capas dos produtos do pacote',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: [],
    cover: null,
    files: [],
  },
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
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'Organize do preço ao pedido: seu panetone pronto para vender',
    promise: 'Material complementar para organizar a produção e a venda dos panetones.',
    deliverableType: 'Kit completo',
    deliverableIcon: 'kit',
    imageType: 'Pilha de capas do kit',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
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
    catalog: false,
    status: 'soon',
    badgeNew: false,
    headline: 'Etiquetas prontas para o seu panetone ter cara de loja',
    promise: 'Rótulos e etiquetas para imprimir em casa. Complementa o Bônus 01.',
    deliverableType: 'Imprimíveis',
    deliverableIcon: 'print',
    imageType: 'Etiquetas e embalagens impressas',
    imageRatio: '2:3',
    testimonials: [],
    featured: false,
    tierS: false,
    placement: ['home-banner', 'item-footer'],
    requiresDismissed: 'kit-lucrativo',
    cover: null,
    files: [],
  },
]

// ---- SUPER OFERTA "Leve tudo": todos os produtos do catálogo num preço único (o preço do combo).
// Tudo desligado/vazio até o Levi definir. Sem comboPriceCents ou sem checkoutUrl o combo aparece "Em breve" com "Quero ser avisada".
export const COMBO: {
  enabled: boolean
  title: string
  // preço do combo em centavos; null = ainda não definido (sem preço na tela)
  comboPriceCents: number | null
  // TODO: checkout Wiapy do combo com o desconto real (vazio até o Caixa criar)
  checkoutUrl: string
  // TODO: id do produto/checkout do combo na Wiapy (para liberar todos os itens quando o webhook for ligado)
  wiapyProductId: string
} = { enabled: false, title: 'Leve tudo', comboPriceCents: null, checkoutUrl: '', wiapyProductId: '' }

// soma dos preços individuais (calculada, nunca digitada)
export const comboSumCents = (offers: { priceCents: number }[]): number => offers.reduce((t, o) => t + o.priceCents, 0)
// só mostra o preço riscado se o combo for mesmo mais barato que a soma
export const comboShowStrike = (priceCents: number | null, sumCents: number): boolean => priceCents !== null && priceCents > 0 && priceCents < sumCents

export const OFFER_IDS: OfferId[] = OFFERS.map((o) => o.id)
export const isOfferId = (id: unknown): id is OfferId => typeof id === 'string' && (OFFER_IDS as string[]).includes(id)

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

// ---------------------------------------------------------------- guia visual por oferta (OFERTAS-GUIA-VISUAL.md)
// Cada oferta tier S tem identidade própria (cor de destaque, paleta e fonte de título). A marca "Fábrica de Panetones" fica discreta
// (só o app em volta). O que não tem guia usa o visual padrão do app. Contraste AA (4,5:1) é conferido nos testes.
export interface OfferVisual {
  // cor de destaque do card (texto, botão, bolinha da jornada): sempre AA contra branco e contra o fundo da paleta
  accentColor: string
  palette: { primary: string; secondary: string; bg: string }
  // fonte do título (Google Fonts). `weight` = o único peso carregado; `fallback` = pilha usada enquanto carrega ou sem internet
  titleFont: { family: string; weight: number; fallback: 'serif' | 'sans' | 'display' }
  // fonte de apoio do guia: usada só na arte do mockup, o app não a carrega (PWA leve)
  bodyFont: string
}

export const DEFAULT_VISUAL: OfferVisual = {
  accentColor: '#7a2e1f',
  palette: { primary: '#7a2e1f', secondary: '#fdf0d9', bg: '#fdf0d9' },
  titleFont: { family: '', weight: 700, fallback: 'sans' },
  bodyFont: '',
}

const vis = (a: string, primary: string, secondary: string, bg: string, family: string, weight: number, fallback: OfferVisual['titleFont']['fallback'], bodyFont: string): OfferVisual => ({
  accentColor: a,
  palette: { primary, secondary, bg },
  titleFont: { family, weight, fallback },
  bodyFont,
})

export const OFFER_VISUAL: Partial<Record<OfferId, OfferVisual>> = {
  'panetones-vulcao': vis('#8E1B1B', '#8E1B1B', '#F2A33A', '#FFF3E0', 'Playfair Display', 700, 'serif', 'Lato'),
  'panetones-vitrine': vis('#1F3A2E', '#1F3A2E', '#C9A24B', '#FAF6EE', 'Cormorant Garamond', 700, 'serif', 'Montserrat'),
  'caixas-doces-natal': vis('#B3122B', '#B3122B', '#0F5B3C', '#F7E7C6', 'Fraunces', 700, 'serif', 'Nunito'),
  'segredo-recheios': vis('#4B2E83', '#4B2E83', '#FF8FA3', '#FFF0F5', 'DM Serif Display', 400, 'serif', 'Poppins'),
  'receitas-explodir-vendas': vis('#0B3C5D', '#0B3C5D', '#FFC400', '#F4F7FA', 'Archivo Black', 400, 'display', 'Inter'),
  'sobremesas-natal': vis('#7A1E3A', '#7A1E3A', '#F5C6CF', '#FFFDF8', 'Abril Fatface', 400, 'display', 'Lora'),
  'ceia-doce': vis('#0E4D64', '#0E4D64', '#E8B04B', '#F2EDE4', 'Bebas Neue', 400, 'display', 'Source Sans 3'),
  // a cor primária da paleta (#E85D75) não passa em AA com texto: a cor de destaque do app é a versão escurecida
  'mini-panetones': vis('#C2334F', '#E85D75', '#FFD36E', '#FFF6F0', 'Baloo 2', 700, 'display', 'Quicksand'),
  'rabanada-padaria': vis('#A8501B', '#A8501B', '#F4C27A', '#FFF4E0', 'Rye', 400, 'display', 'Merriweather Sans'),
  'doces-para-revender': vis('#00796B', '#00796B', '#FF7043', '#F1FAF8', 'Poppins', 800, 'sans', 'Open Sans'),
}
// nome curto para mapa, coleções e ganchos (o título completo é longo para caber numa etapa do mapa)
const SHORT: Partial<Record<OfferId, string>> = {
  'panetones-vulcao': 'Panetones Vulcão',
  'panetones-vitrine': 'Panetones de Vitrine',
  'caixas-doces-natal': 'Caixas de Doces',
  'segredo-recheios': 'Segredo dos Recheios',
  'receitas-explodir-vendas': '15 Receitas',
  'sobremesas-natal': '20 Sobremesas',
  'ceia-doce': 'Ceia Doce',
  'mini-panetones': 'Mini Panetones',
  'rabanada-padaria': 'Rabanada de Padaria',
  'doces-para-revender': 'Doces para Revender',
}
export const shortTitle = (id: OfferId): string => SHORT[id] ?? OFFER_BY_ID[id].title.split(':')[0]

export const visualOf = (id: OfferId): OfferVisual => OFFER_VISUAL[id] ?? DEFAULT_VISUAL
export const hasOwnVisual = (id: OfferId): boolean => !!OFFER_VISUAL[id]

// contraste WCAG entre duas cores #rrggbb
export function contrastRatio(a: string, b: string): number {
  const lum = (h: string) => {
    const v = h.replace('#', '')
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// cor de texto (branco ou o marrom escuro do app) com mais contraste sobre um fundo
export const INK = '#2b1d16'
export const readableOn = (bg: string): string => (contrastRatio('#ffffff', bg) >= contrastRatio(INK, bg) ? '#ffffff' : INK)
// URL do CSS do Google Fonts (só a fonte do título, um único peso, display=swap)
export const titleFontUrl = (v: OfferVisual): string =>
  v.titleFont.family ? `https://fonts.googleapis.com/css2?family=${v.titleFont.family.replace(/ /g, '+')}:wght@${v.titleFont.weight}&display=swap` : ''

// valor somado dos itens da pilha: preço do produto + valor de cada bônus (calculado). Só é comparativo; o rótulo na tela é sempre "valor somado dos itens".
export const offerValueFromCents = (o: Offer): number => o.priceCents + (o.bonus ?? []).reduce((t, b) => t + b.valueCents, 0)

// ---- CATÁLOGO COMO SISTEMA (OFERTAS-MAPA-DE-COMBINACOES.md): trilhas, ganchos e coleções.
// Regras: a compra nunca é bloqueada (a trilha só orienta e destaca o próximo passo); sem relógio, sem escassez, sem número de ganho.

export type TrackId = 'aprender' | 'ceia' | 'vender' | 'temporadas'

export interface TrackStep {
  offer: OfferId
  // previsão em texto (sem contagem regressiva); só nas "próximas estações"
  when?: string
}

export interface Track {
  id: TrackId
  title: string
  tagline: string
  steps: TrackStep[]
}

// ordem de exibição em novembro: APRENDER e CEIA primeiro, VENDER logo em seguida, TEMPORADAS por último
export const TRACKS: Track[] = [
  {
    id: 'aprender',
    title: 'Panetone de confeitaria',
    tagline: 'Aprender: do recheio ao acabamento',
    steps: [{ offer: 'panetones-vulcao' }, { offer: 'segredo-recheios' }, { offer: 'panetones-vitrine' }, { offer: 'mini-panetones' }],
  },
  {
    id: 'ceia',
    title: 'Ceia completa',
    tagline: 'Ceia: a mesa doce de Natal',
    steps: [{ offer: 'sobremesas-natal' }, { offer: 'ceia-doce' }, { offer: 'rabanada-padaria' }],
  },
  {
    id: 'vender',
    title: 'Encomendas de dezembro',
    tagline: 'Vender: receitas, caixas e divulgação',
    steps: [{ offer: 'receitas-explodir-vendas' }, { offer: 'caixas-doces-natal' }, { offer: 'doces-para-revender' }],
  },
  {
    id: 'temporadas',
    // Páscoa e o pacote do ano inteiro estão fora do catálogo (lista fechada): o app só mostra as etapas que estão no catálogo
    title: 'Natal e Ano Novo',
    tagline: 'Temporadas: as próximas estações',
    steps: [
      { offer: 'mesa-doce-ano-novo', when: 'a partir de 20/12' },
      { offer: 'janeiro-panetone', when: 'janeiro' },
      { offer: 'fornada-pascoa', when: 'janeiro (Páscoa)' },
      { offer: 'ano-inteiro-encomendas', when: 'depois da Páscoa' },
    ],
  },
]

export interface Hook {
  from: OfferId
  to: OfferId
  // "bridge" = ponte entre trilhas
  kind: 'track' | 'bridge'
  text: string
}

// "Depois de X, o próximo passo é Y". Aparece no rodapé do produto e no mapa; o clique leva ao card do próximo.
export const HOOKS: Hook[] = [
  { from: 'panetones-vulcao', to: 'segredo-recheios', kind: 'track', text: 'Fez o vulcão? O próximo passo é dominar a técnica por trás do recheio, para nunca desandar.' },
  { from: 'segredo-recheios', to: 'panetones-vitrine', kind: 'track', text: 'Recheio perfeito pede acabamento e foto à altura.' },
  { from: 'panetones-vitrine', to: 'mini-panetones', kind: 'track', text: 'Panetone bonito pronto? Agora em tamanho presente.' },
  { from: 'panetones-vitrine', to: 'ceia-doce', kind: 'bridge', text: 'Mesa bonita pede doces à altura: a Ceia Doce completa o cenário.' },
  { from: 'mini-panetones', to: 'caixas-doces-natal', kind: 'bridge', text: 'Mini panetones prontos? Uma caixa de presente com doces acompanha bem.' },
  { from: 'sobremesas-natal', to: 'ceia-doce', kind: 'track', text: 'A mesa de Natal pede mais variedade, sem panetone.' },
  { from: 'ceia-doce', to: 'rabanada-padaria', kind: 'track', text: 'Fechando a mesa: a rabanada que não pode faltar.' },
  { from: 'receitas-explodir-vendas', to: 'caixas-doces-natal', kind: 'track', text: 'Já escolheu as receitas do mês? Agora transforme em caixa de presente.' },
  { from: 'caixas-doces-natal', to: 'doces-para-revender', kind: 'track', text: 'Caixa montada: kit de artes e textos para oferecer e fechar encomenda.' },
  { from: 'mesa-doce-ano-novo', to: 'janeiro-panetone', kind: 'track', text: 'Passou a virada? Janeiro também tem panetone.' },
  { from: 'janeiro-panetone', to: 'fornada-pascoa', kind: 'track', text: 'Próxima estação: a Páscoa.' },
  { from: 'fornada-pascoa', to: 'ano-inteiro-encomendas', kind: 'track', text: 'Fechando o ano: o pacote com tudo.' },
]

export const hooksFrom = (id: ItemId): Hook[] => HOOKS.filter((h) => h.from === id)
export const hookBetween = (from: ItemId, to: ItemId): Hook | undefined => HOOKS.find((h) => h.from === from && h.to === to)

// COLEÇÕES por objetivo. collectionPriceCents null = sem preço definido: a tela mostra só a soma e "Quero ser avisada".
export type CollectionId = 'primeira-fornada' | 'panetone-confeitaria' | 'ceia-completa' | 'presentes-que-vendem' | 'encomendas-dezembro'

export interface Collection {
  id: CollectionId
  title: string
  goal: string
  items: OfferId[]
  // TODO Levi: preço da coleção em centavos (vazio = só "Quero ser avisada")
  collectionPriceCents: number | null
  // TODO Caixa: checkout Wiapy da coleção (vazio = sem compra)
  checkoutUrl: string
  // TODO Caixa: id do produto/checkout da coleção na Wiapy (libera todos os itens quando o webhook reconhecer)
  wiapyProductId: string
}

// "Primeira fornada" é a coleção de entrada (ticket baixo)
export const COLLECTIONS: Collection[] = [
  { id: 'primeira-fornada', title: 'Primeira Fornada', goal: 'Para começar: o panetone com recheio e a rabanada', items: ['panetones-vulcao', 'rabanada-padaria'], collectionPriceCents: null, checkoutUrl: '', wiapyProductId: '' },
  { id: 'panetone-confeitaria', title: 'Panetone de Confeitaria', goal: 'Do recheio ao acabamento de vitrine', items: ['panetones-vulcao', 'segredo-recheios', 'panetones-vitrine'], collectionPriceCents: null, checkoutUrl: '', wiapyProductId: '' },
  { id: 'ceia-completa', title: 'Ceia Completa', goal: 'A mesa doce de Natal do começo ao fim', items: ['sobremesas-natal', 'ceia-doce', 'rabanada-padaria'], collectionPriceCents: null, checkoutUrl: '', wiapyProductId: '' },
  { id: 'presentes-que-vendem', title: 'Presentes que Vendem', goal: 'Caixas, minis e divulgação para oferecer de presente', items: ['caixas-doces-natal', 'mini-panetones', 'doces-para-revender'], collectionPriceCents: null, checkoutUrl: '', wiapyProductId: '' },
  { id: 'encomendas-dezembro', title: 'Encomendas de Dezembro', goal: 'Receitas, caixas e divulgação para a temporada', items: ['receitas-explodir-vendas', 'caixas-doces-natal', 'doces-para-revender'], collectionPriceCents: null, checkoutUrl: '', wiapyProductId: '' },
]
export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c])) as Record<CollectionId, Collection>
export const isCollectionId = (x: unknown): x is CollectionId => typeof x === 'string' && x in COLLECTION_BY_ID

// soma dos preços dos itens (calculada). Riscada na tela só quando o preço da coleção é menor, sempre com o rótulo "soma dos itens".
export const collectionSumCents = (c: Collection): number => c.items.reduce((t, id) => t + OFFER_BY_ID[id].priceCents, 0)
// "Faltam N": itens da coleção que o cliente ainda não tem (pelos entitlements)
export const collectionMissing = (c: Collection, owned: readonly string[]): OfferId[] => c.items.filter((id) => !owned.includes(id))

// próximo passo de cada trilha: o primeiro item que o cliente ainda não tem. `unlocked` = a etapa anterior já está liberada
// (o app destaca esse card; comprar nunca fica bloqueado).
export function trackNext(t: Track, owned: readonly string[]): { offer: OfferId; index: number; prev: OfferId | null } | null {
  const i = t.steps.findIndex((st) => !owned.includes(st.offer))
  if (i < 0) return null
  return { offer: t.steps[i].offer, index: i, prev: i > 0 ? t.steps[i - 1].offer : null }
}

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
  titleHints: ['fichas de socorro', 'fichas'],
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
  // ids de produto liberados por ESTE pagamento (kit, bump, ofertas). Estorno/chargeback revoga só estes.
  entitlements?: ItemId[]
  status: PurchaseStatus
  source: 'wiapy' | 'manual' | 'csv'
  createdAt: string
}

export interface MeResponse {
  email: string
  plan: PlanId | null
  items: ItemId[]
  // o que a cliente pode abrir agora (mesma lista de items): cada produto fica 'liberado' se o id está aqui, senão 'bloqueado'
  entitlements: ItemId[]
  purchases: PurchaseView[]
}
