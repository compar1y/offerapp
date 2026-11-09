// Conteúdo do app: onboarding, perfis, jornada (5 etapas, 21 lições), Lojinha e textos das ofertas.
// Base: desenho v2 (app-novo/desenho-do-app.md), pesquisas Gemini/Grok e a seção 5 da aula do Arthur.
import type { MaterialId, ProdutoId } from './catalogo.js'

export const PERGUNTAS: { t: string; o: string[] }[] = [
  { t: 'Qual é o seu maior objetivo neste Natal?', o: ['Ter um dinheiro meu, para as minhas coisas', 'Ajudar nas contas da casa e dos filhos', 'Fazer para a família e economizar nos presentes'] },
  { t: 'O que mais te dá frio na barriga hoje?', o: ['A receita dar errado e eu jogar dinheiro fora', 'Ter vergonha de oferecer e ninguém comprar', 'Não saber por quanto vender'] },
  { t: 'Como é o seu tempo?', o: ['Trabalho fora, só tenho um tempinho à noite', 'Fico em casa, mas a rotina é corrida', 'Tenho o dia livre para as fornadas'] },
  { t: 'Alguém da família está te apoiando?', o: ['Não, acham que é mais um gasto', 'Ainda não contei, vai ser surpresa', 'Sim, estão torcendo por mim'] },
  { t: 'Qual é a sua experiência na cozinha?', o: ['Nunca fiz pão nem panetone', 'Faço o básico, mas nunca vendi', 'Já vendo outros doces'] },
]

export type PerfilId = 'desacreditada' | 'semClientes' | 'semPreco' | 'corrida' | 'iniciante'

export interface Perfil {
  id: PerfilId
  nome: string
  frase: string
  missao: string
  /** etapa sugerida para começar (1 a 5) */
  comecaEm: number
  /** ordem das ofertas no card do painel */
  ofertas: ProdutoId[]
}

export const PERFIS: Record<PerfilId, Perfil> = {
  desacreditada: { id: 'desacreditada', nome: 'A Desacreditada', frase: 'Seu primeiro panetone em 48 horas, com a foto que prova que você consegue.', missao: 'Testar o fermento e fazer meia receita', comecaEm: 1, ofertas: ['recheios', 'encomenda'] },
  semClientes: { id: 'semClientes', nome: 'A Confeiteira Sem Clientes', frase: 'Suas clientes já estão no seu WhatsApp.', missao: 'Mandar a foto do panetone para 1 pessoa, no privado', comecaEm: 4, ofertas: ['encomenda', 'recheios'] },
  semPreco: { id: 'semPreco', nome: 'A Vendedora Sem Preço', frase: 'Você está pagando para trabalhar? Faça a conta agora.', missao: 'Preencher a Tabela de Custo com 1 receita', comecaEm: 3, ofertas: ['encomenda', 'recheios'] },
  corrida: { id: 'corrida', nome: 'A Corrida Contra o Tempo', frase: 'Um passo curto por dia, no tempo que sobra depois da rotina.', missao: 'Escolher 1 receita e separar os ingredientes', comecaEm: 1, ofertas: ['recheios', 'encomenda'] },
  iniciante: { id: 'iniciante', nome: 'A Iniciante Caprichosa', frase: 'Do zero ao primeiro panetone fofinho, sem desperdiçar.', missao: 'Testar o fermento (2 minutos)', comecaEm: 1, ofertas: ['recheios', 'encomenda'] },
}

/** respostas = índice da opção escolhida em cada uma das 5 perguntas */
export function perfilDe(r: number[]): PerfilId {
  if (r[3] === 0 || r[3] === 1) return 'desacreditada'
  if (r[1] === 1 && r[4] >= 1) return 'semClientes'
  if (r[1] === 2) return 'semPreco'
  if (r[2] === 0 || r[2] === 1) return 'corrida'
  return 'iniciante'
}

/** o porquê do perfil, repetindo as palavras que ela escolheu */
export function porqueDoPerfil(p: PerfilId, r: number[]): string {
  switch (p) {
    case 'desacreditada':
      return r[3] === 0
        ? 'Você disse que a família acha que é mais um gasto. A melhor resposta é um panetone bonito na mesa. Por isso a gente começa pela foto que prova que você consegue.'
        : 'Você disse que ainda não contou para ninguém. Então a surpresa vai ser um panetone bonito na mesa, e a gente começa pela foto que prova que você consegue.'
    case 'semClientes':
      return 'Você disse que o seu frio na barriga é ter vergonha de oferecer. Aqui você não precisa postar nada: a primeira oferta é uma foto para uma pessoa só.'
    case 'semPreco':
      return 'Você disse que não sabe por quanto vender. Antes de assar, a gente faz a conta com gás e energia, para você cobrar sem medo.'
    case 'corrida':
      return 'Você disse que a rotina é corrida. Cada lição leva até 15 minutos, e o painel mostra só o passo de hoje.'
    default:
      return 'Você disse que tem medo de a receita dar errado e jogar dinheiro fora. Por isso a primeira missão é um teste de 2 minutos e meia receita.'
  }
}

/** ponteiro para uma página de um material: "ebook:1" */
export type Ref = `${MaterialId}:${number}`

export interface Licao {
  id: string
  titulo: string
  minutos: number
  texto: string
  tarefa: string
  /** onde está no material (abre no leitor) */
  ver?: { rotulo: string; ref: Ref; seTiver?: MaterialId; senao?: { rotulo: string; ref: Ref } }
  /** lição da foto que prova: ganha o selo "Primeira foto" */
  foto?: boolean
}

export interface Etapa {
  n: number
  titulo: string
  subtitulo: string
  licoes: Licao[]
  /** oferta ao concluir a etapa (só aparece se ela ainda não tem) */
  ofertaAoConcluir?: ProdutoId
}

export const ETAPAS: Etapa[] = [
  {
    n: 1, titulo: 'O Primeiro Panetone', subtitulo: 'em 48 horas', ofertaAoConcluir: 'recheios',
    licoes: [
      { id: '1.1', titulo: 'Testar o fermento', minutos: 2, texto: 'Antes de gastar com chocolate e frutas, veja se o seu fermento está vivo. Misture 1 colher (chá) de fermento, 1 colher (chá) de açúcar e 3 colheres (sopa) de água morna. Em 10 a 15 minutos tem que espumar.', tarefa: 'Faça o teste. Espumou? Pode seguir. Não espumou? Troque o fermento antes de começar.', ver: { rotulo: 'Ficha 01: Não cresceu nada', ref: 'fichas-socorro:4' } },
      { id: '1.2', titulo: 'Meia receita de teste', minutos: 15, texto: 'A primeira fornada é treino. Faça a Receita 001, o Chocotone Caseiro, que é a massa base de quase todas as outras. Se quiser gastar menos, faça a metade das quantidades.', tarefa: 'Separe os ingredientes e as fôrmas da Receita 001.', ver: { rotulo: 'Receita 001: Chocotone Caseiro', ref: 'ebook:1' } },
      { id: '1.3', titulo: 'A sova e o ponto da massa', minutos: 15, texto: 'O ponto certo é quando a massa fica lisa e elástica. Puxe um pedacinho entre os dedos: se esticar fininho sem rasgar, está pronta. Se rasgar, sove mais um pouco.', tarefa: 'Faça a esponja e a massa seguindo as etapas da receita.', ver: { rotulo: 'Receita 001, etapas 1 a 4', ref: 'ebook:1' } },
      { id: '1.4', titulo: 'Assar e esfriar sem murchar', minutos: 10, texto: 'O tempo da receita é referência: o ponto certo é o que você vê na massa. Ao sair do forno, espete os palitos na base e deixe esfriar de cabeça para baixo. É isso que impede o panetone de murchar.', tarefa: 'Asse e deixe esfriar de cabeça para baixo.', ver: { rotulo: 'Receita 001, etapas 7 e 8', ref: 'ebook:1' } },
      { id: '1.5', titulo: 'A foto que prova', minutos: 10, foto: true, texto: 'Corte o panetone perto de uma janela, com luz do dia. Uma foto dele aberto, mostrando o miolo, e outra inteiro. É essa foto que vai abrir as suas encomendas.', tarefa: 'Tire as 2 fotos. Se quiser, mande para 1 pessoa da família.', ver: { rotulo: 'Bônus 03: luz e organização da foto', ref: 'b03:7' } },
    ],
  },
  {
    n: 2, titulo: 'Com Cara de Presente', subtitulo: 'recheio, embalagem e kit',
    licoes: [
      { id: '2.1', titulo: 'Recheio que faz pedir outro', minutos: 15, texto: 'O recheio é o que transforma o panetone simples num presente. Escolha 1 recheio só para começar e teste numa unidade.', tarefa: 'Escolha o seu primeiro recheio.', ver: { rotulo: '10 Recheios: Brigadeiro Cremoso', ref: 'recheios:2', seTiver: 'recheios', senao: { rotulo: 'Receita 011: Recheado de Brigadeiro', ref: 'ebook:11' } } },
      { id: '2.2', titulo: 'Embalagem barata que vende', minutos: 10, texto: 'Antes de embalar, espere esfriar por completo. Uma embalagem transparente com laço e tag já faz o panetone parecer de loja.', tarefa: 'Escolha 1 modelo de embalagem e anote o material.', ver: { rotulo: 'Bônus 01: 6 passos antes de embalar', ref: 'b01:2' } },
      { id: '2.3', titulo: 'Montar o seu primeiro kit', minutos: 10, texto: 'Kit é o que a pessoa compra para dar de presente. Comece pelo mais simples, com 1 panetone e um mimo.', tarefa: 'Escolha 1 kit para oferecer.', ver: { rotulo: 'Bônus 02: escolha seus primeiros kits', ref: 'b02:2' } },
      { id: '2.4', titulo: 'A foto da embalagem', minutos: 10, texto: 'A segunda foto que vende é o panetone embalado, pronto para presente. Mesma luz da janela, fundo limpo.', tarefa: 'Tire a foto do panetone embalado.', ver: { rotulo: 'Bônus 03: sequência e checklist das fotos', ref: 'b03:8' } },
    ],
  },
  {
    n: 3, titulo: 'O Preço Certo', subtitulo: 'cobrar sem vergonha',
    licoes: [
      { id: '3.1', titulo: 'Quanto custa o seu, de verdade', minutos: 15, texto: 'O custo real tem mais do que os ingredientes: entra a embalagem, o gás e a energia, e a perda. Quem esquece isso trabalha de graça.', tarefa: 'Leia as 6 partes do custo real.', ver: { rotulo: 'Bônus 07: o custo real tem 6 partes', ref: 'b07:3' } },
      { id: '3.2', titulo: 'Achar a sua receita na tabela', minutos: 10, texto: 'A tabela já tem a conta das 100 receitas. Ache a sua e confira o custo completo e os três preços sugeridos.', tarefa: 'Ache a receita que você fez e anote o custo.', ver: { rotulo: 'Bônus 07: como usar em 3 passos', ref: 'b07:2' } },
      { id: '3.3', titulo: 'Quando disserem "tá caro"', minutos: 10, texto: 'Pedido de desconto é normal. Você não precisa baixar o preço: pode oferecer um tamanho menor ou outra opção.', tarefa: 'Leia as respostas prontas para pedido de desconto.', ver: { rotulo: 'Bônus 04: mensagens 13 a 15', ref: 'b04:7' } },
    ],
  },
  {
    n: 4, titulo: 'As Primeiras Encomendas', subtitulo: 'sem vergonha de oferecer', ofertaAoConcluir: 'encomenda',
    licoes: [
      { id: '4.1', titulo: 'Mandar a foto para 1 pessoa', minutos: 5, texto: 'Você não precisa postar nada. Mande a foto do panetone aberto para 1 pessoa que gosta de você, no privado, e conte que está fazendo para o Natal.', tarefa: 'Mande a foto para 1 pessoa.', ver: { rotulo: 'Bônus 04: mensagens 01 a 03', ref: 'b04:3' } },
      { id: '4.2', titulo: 'O cardápio no WhatsApp', minutos: 15, texto: 'Com o cardápio pronto, a cliente escolhe sozinha: sabor, tamanho e preço numa mensagem só.', tarefa: 'Preencha o cardápio com os sabores que você já faz.', ver: { rotulo: 'Bônus 03: preencha antes de enviar', ref: 'b03:2' } },
      { id: '4.3', titulo: 'A pré-venda', minutos: 10, texto: 'Abra as encomendas com data de entrega. Assim você só compra ingrediente para o que já foi pedido.', tarefa: 'Defina a data da sua primeira fornada de encomendas.', ver: { rotulo: 'Bônus 04: escolha a situação atual', ref: 'b04:4' } },
      { id: '4.4', titulo: 'Quem avisar primeiro', minutos: 10, texto: 'Comece por quem já confia em você: família, vizinhança, colegas de trabalho, igreja e escola dos filhos.', tarefa: 'Escreva 5 nomes de quem você vai avisar primeiro.', ver: { rotulo: 'Bônus 04: abertura no status e cliente antigo', ref: 'b04:3' } },
    ],
  },
  {
    n: 5, titulo: 'Dar Conta Até o Dia 24', subtitulo: 'organizar as fornadas', ofertaAoConcluir: 'encomenda',
    licoes: [
      { id: '5.1', titulo: 'A sua capacidade', minutos: 15, texto: 'Quantos panetones cabem no seu forno e no seu tempo? Com esse número você nunca promete mais do que dá conta.', tarefa: 'Anote quantas unidades cabem por fornada.', ver: { rotulo: 'Bônus 05: agenda e capacidade', ref: 'b05-guia:5' } },
      { id: '5.2', titulo: 'Planejar de trás para a frente', minutos: 15, texto: 'Comece pela data de entrega e volte: embalagem, forno, fermentação e compras.', tarefa: 'Monte o cronograma da sua primeira semana.', ver: { rotulo: 'Bônus 05: cronograma real', ref: 'b05-guia:7' } },
      { id: '5.3', titulo: 'O Plano B trufado', minutos: 10, texto: 'Faltou tempo? O Plano B usa um chocotone pronto, recheio e cobertura para entregar no prazo.', tarefa: 'Leia o Plano B e guarde para uma emergência.', ver: { rotulo: 'Bônus 06: Plano B Trufado Rápido', ref: 'b06:1' } },
      { id: '5.4', titulo: 'Entregar e encantar', minutos: 10, texto: 'Depois da entrega, agradeça e peça a opinião. É assim que a cliente volta e indica.', tarefa: 'Leia as mensagens de agradecimento e de feedback.', ver: { rotulo: 'Bônus 04: mensagens 28 a 30', ref: 'b04:12' } },
      { id: '5.5', titulo: 'O que vender depois do panetone', minutos: 10, texto: 'O Natal tem outros doces que saem junto: pão de mel, biscoitos, rabanada e cookies.', tarefa: 'Escolha 1 doce para oferecer junto com o panetone.', ver: { rotulo: 'Bônus 08: +50 Receitas do Cardápio de Natal', ref: 'b08:1' } },
    ],
  },
]

export const TODAS_LICOES = ETAPAS.flatMap((e) => e.licoes.map((l) => ({ ...l, etapa: e.n })))

export interface ItemLoja { id: string; icone: string; titulo: string; custo: number; material?: MaterialId; ref?: Ref }

/** Lojinha: troca de Moedas Douradas por prêmios. v1: prêmios dentro do que já existe nos materiais
 *  (páginas para imprimir), até os prêmios novos (etiquetas, cartões) serem produzidos. */
export const LOJA: ItemLoja[] = [
  { id: 'planejador', icone: '🖨️', titulo: 'Planejador de produção para imprimir e colar na geladeira', custo: 60, ref: 'b05-imprimivel:1' },
  { id: 'checagem', icone: '✅', titulo: 'Checagem de 1 minuto antes de cada fornada (para imprimir)', custo: 120, ref: 'fichas-socorro:25' },
  { id: 'trufado', icone: '🍫', titulo: 'Atalho: Plano B Trufado completo', custo: 250, ref: 'b06:1' },
]

export interface TextoOferta { gancho: string; sub?: string; itens: string[]; botao: string; garantia: string }

// a oferta Videoaulas tem página própria (src/telas/OfertaVideo.tsx)
export const OFERTAS: Record<Exclude<ProdutoId, 'kit' | 'videoaulas'>, TextoOferta> = {
  recheios: {
    gancho: 'Seu panetone já saiu do forno. Agora é o recheio que faz a pessoa pedir outro.',
    itens: ['Os 10 recheios mais pedidos no Natal, de brigadeiro a pistache', 'Ingredientes, modo de preparo e rendimento de cada um', 'Quanto custa cada recheio e por quanto vender'],
    botao: 'Quero os 10 recheios',
    garantia: '7 dias de garantia.',
  },
  encomenda: {
    gancho: 'Você já sabe fazer. Agora falta quem compre: a primeira encomenda, a cliente que volta e a que traz outra.',
    itens: ['O Círculo de Confiança: sua lista de 30 nomes', 'A Fatia que Abre Portas: a degustação certa', 'A pré-venda com sinal no PIX', 'O Caderninho de Clientes para acompanhar cada pedido'],
    botao: 'Quero minhas clientes',
    garantia: '7 dias de garantia.',
  },
  etiquetas: {
    gancho: 'Digite o nome do seu negócio e, em segundos, saem 6 imagens e as suas etiquetas prontas. Sem designer, sem Canva.',
    // só cita campos que a entrega tem de verdade (src/telas/Etiquetas.tsx): nome, WhatsApp, sabores, pedidos até e entrega
    sub: 'Tudo personalizado na hora com os seus dados: o nome do negócio, o WhatsApp, os sabores, até quando você aceita pedidos e como você entrega.',
    itens: [
      'Personalizado na hora: você escreve uma vez, no celular, e todas as peças saem com os seus dados',
      '6 imagens de Natal para o WhatsApp (3 para o Status e 3 quadradas) com o seu nome, os seus sabores, a data limite dos pedidos e o jeito que você entrega',
      'Etiquetas “Feito à mão por” com o seu nome e os seus sabores já escritos',
      'Cartões de presente e de agradecimento com o seu nome (e o seu WhatsApp, se quiser)',
      'Tudo em PDF para imprimir em casa ou na papelaria, com versão em preto e branco e modelo para escrever à mão',
    ],
    botao: 'Quero com o meu nome',
    garantia: '7 dias de garantia. Peças de apresentação, não são rótulo oficial (sem validade nem ingredientes).',
  },
  primeira: {
    gancho: 'Comece só pela primeira encomenda: da lista de contatos até o primeiro pedido pago.',
    itens: ['4 capítulos, 4 dias, 1 objetivo', 'A lista de 30 nomes e a degustação certa', 'A pré-venda com sinal e a fala cara a cara', 'O Caderninho de Clientes para imprimir'],
    botao: 'Quero minha primeira encomenda',
    garantia: '7 dias de garantia.',
  },
}

export const AVATARES = ['👩🏽‍🍳', '👩🏻‍🍳', '👩🏿‍🍳', '👵🏽', '🧑🏾‍🍳', '👩🏼‍🍳']
