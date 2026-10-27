// Gamificação "Minha fornada": regras puras (sem tela, sem rede). Roda no aparelho da cliente e nos testes.
// Regras de honestidade: ponto só por ação que a cliente marcou; teto de 60 PF por dia; nível nunca desce; sem sorteio,
// sem prêmio em dinheiro, sem prazo punitivo, sem promessa de renda. Pontos não são gastos: extras abrem por progresso (nível, receitas feitas, dias, selos, contas).
import type { ItemId } from './catalog'

// ------------------------------------------------------------ textos fixos de aviso honesto (literais do GAMIFICACAO-GPT.md)
export const GAME_TEXT = {
  pontos: 'Pontos de Fornada contam o que você marcou como feito. Não valem dinheiro e não são sorteio.',
  extras: 'Extra do app, liberado por progresso. Nada do que você comprou fica trancado.',
  encomendas: 'Este caderno é só seu. O app não calcula nem promete ganho.',
  privacidade: 'Suas fotos e anotações ficam no seu aparelho.',
  extrato: 'Pontos só contam o que você fez de verdade.',
  semPressao: 'Prefere cozinhar sem placar? Tudo bem, ligue ou desligue quando quiser.',
  descanso: '1 dia de descanso por semana não quebra a sequência.',
} as const

// ------------------------------------------------------------ tabela de pontos (PF)
export const PF = {
  feita: 10, // "Fiz essa", primeira vez da receita
  refeita: 3, // refazer a mesma receita (no máximo 1 vez por dia)
  casa: 5, // 3ª fornada da mesma receita: selo dourado "Receita de casa"
  foto: 5,
  nota: 3,
  ingredientes: 2,
  etapa: 15, // etapa de "Seu caminho" concluída
  desafio: 20,
  desafioTodos: 30, // extra por fechar os 3 da semana
  seq3: 10,
  seq7: 25,
  primeiraEncomenda: 10,
  entregue: 5,
  socorro: 5,
  metaDia: 2,
  sugestao: 5,
  conta: 15,
  presente: 10,
  variedade: 10,
  contaReceita: 5, // Conta da Fornada: receita DIFERENTE com conta concluída (máx. 2 por dia)
  conta5: 10, // selo "Conta de 5 receitas", uma vez
  missao: 4, // cada missão do dia marcada pela ação real
  missaoTodas: 6, // as 3 missões do dia
  secreto: 5, // selo surpresa (uma vez cada)
  constancia: 10, // selo surpresa de 14 dias
  venda1: 10, // primeira venda anotada no diário (uma vez)
} as const
export const CONTA_POR_DIA = 2
export const DAILY_CAP = 60
export const WEEKLY_CHALLENGE_MAX = 3 * PF.desafio + PF.desafioTodos // 90
export const DELIVERED_PER_DAY = 3
export const SOCORRO_PER_DAY = 2

export const LEVELS = [
  { id: 'aprendiz', name: 'Aprendiz', min: 0 },
  { id: 'fornada', name: 'Fornada', min: 100 },
  { id: 'confeiteira', name: 'Confeiteira', min: 300 },
  { id: 'mestra', name: 'Mestra do Panetone', min: 700 },
] as const

export function levelIndex(pf: number): number {
  let idx = 0
  LEVELS.forEach((l, i) => {
    if (pf >= l.min) idx = i
  })
  return idx
}

export interface LevelView {
  idx: number
  name: string
  next: { name: string; faltam: number } | null
  pct: number // barra até o próximo nível
}
export function levelView(pf: number, reached = 0): LevelView {
  const idx = Math.max(levelIndex(pf), reached) // o nível nunca desce
  const cur = LEVELS[idx]
  const nxt = LEVELS[idx + 1]
  if (!nxt) return { idx, name: cur.name, next: null, pct: 100 }
  const span = nxt.min - cur.min
  return { idx, name: cur.name, next: { name: nxt.name, faltam: Math.max(0, nxt.min - pf) }, pct: Math.max(0, Math.min(100, Math.round(((pf - cur.min) / span) * 100))) }
}
export const levelUpText = (idx: number): string => {
  const nxt = LEVELS[idx + 1]
  return `Você agora é ${LEVELS[idx].name}!${nxt ? ` Continue, a sua próxima parada é ${nxt.name}.` : ' Você chegou ao último nível. Obrigado por cozinhar com a gente.'}`
}

// ------------------------------------------------------------ datas (texto AAAA-MM-DD, sempre no horário local da cliente)
export const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayNum = (s: string): number => {
  const [y, m, d] = s.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}
export const addDays = (s: string, n: number): string => {
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}
export const diffDays = (a: string, b: string): number => dayNum(b) - dayNum(a)
// segunda-feira da semana (chave da semana)
export const weekKey = (s: string): string => addDays(s, -((dayNum(s) + 3) % 7)) // 1970-01-01 foi quinta
export const weekIndex = (s: string): number => Math.floor((dayNum(weekKey(s)) + 3) / 7)
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// ------------------------------------------------------------ o que cada material alimenta
export type Branch = 'massa' | 'recheio' | 'cobertura' | 'embalagem' | 'venda'
export const BRANCHES: { id: Branch; name: string }[] = [
  { id: 'massa', name: 'Massa' },
  { id: 'recheio', name: 'Recheio' },
  { id: 'cobertura', name: 'Cobertura' },
  { id: 'embalagem', name: 'Embalagem' },
  { id: 'venda', name: 'Venda' },
]
export const BRANCH_TIERS = [
  { name: 'Iniciante', min: 2 },
  { name: 'Segura', min: 10 },
  { name: 'Craque', min: 20 },
] as const // +2 pontos de ramo por receita: 1, 5 e 10 receitas
export function branchTier(pts: number): { name: string; idx: number; next: number | null } {
  let idx = -1
  BRANCH_TIERS.forEach((t, i) => {
    if (pts >= t.min) idx = i
  })
  return { name: idx < 0 ? 'Começando' : BRANCH_TIERS[idx].name, idx, next: BRANCH_TIERS[idx + 1]?.min ?? null }
}

export type CatId = 'classico' | 'recheado' | 'vitrine' | 'infantil' | 'sobremesa' | 'presente' | 'venda' | 'cardapio'
export const CATEGORIES: Record<CatId, string> = {
  classico: 'Clássico e massa',
  recheado: 'Recheado',
  vitrine: 'Vitrine e premium',
  infantil: 'Infantil e mini',
  sobremesa: 'Sobremesas e ceia',
  presente: 'Presentes e caixas',
  venda: 'Organização e venda',
  cardapio: 'Cardápio de Natal',
}
const CAT_REASON: Record<CatId, string> = {
  classico: 'para firmar a base da massa antes de variar',
  recheado: 'para treinar o recheio, que muda o jeito do panetone',
  vitrine: 'para caprichar no acabamento',
  infantil: 'para fazer algo diferente e divertido',
  sobremesa: 'para variar a mesa de fim de ano',
  presente: 'para preparar lembranças com calma',
  venda: 'para organizar o que vem pela frente',
  cardapio: 'combina com o clima de fim de ano',
}
export const GAME_ITEMS: Partial<Record<ItemId, { branch: Branch; cat: CatId }>> = {
  main: { branch: 'massa', cat: 'classico' },
  'ponto-perfeito': { branch: 'massa', cat: 'classico' },
  'panetones-vulcao': { branch: 'recheio', cat: 'recheado' },
  'segredo-recheios': { branch: 'recheio', cat: 'recheado' },
  'chocotone-colher': { branch: 'recheio', cat: 'sobremesa' },
  'panetones-vitrine': { branch: 'cobertura', cat: 'vitrine' },
  'panetones-premium': { branch: 'cobertura', cat: 'vitrine' },
  'mini-panetones': { branch: 'massa', cat: 'infantil' },
  'natal-criancas': { branch: 'cobertura', cat: 'infantil' },
  'janeiro-panetone': { branch: 'massa', cat: 'recheado' },
  'sobremesas-natal': { branch: 'recheio', cat: 'sobremesa' },
  'ceia-doce': { branch: 'recheio', cat: 'sobremesa' },
  'rabanada-padaria': { branch: 'massa', cat: 'sobremesa' },
  'mesa-doce-ano-novo': { branch: 'recheio', cat: 'sobremesa' },
  'caixas-doces-natal': { branch: 'embalagem', cat: 'presente' },
  'cesta-natal-caseira': { branch: 'embalagem', cat: 'presente' },
  'biscoitos-natal-decorados': { branch: 'cobertura', cat: 'presente' },
  'doces-para-revender': { branch: 'embalagem', cat: 'presente' },
  'bonus-01': { branch: 'embalagem', cat: 'venda' },
  'bonus-02': { branch: 'embalagem', cat: 'presente' },
  'bonus-03': { branch: 'venda', cat: 'venda' },
  'bonus-04': { branch: 'venda', cat: 'venda' },
  'bonus-05': { branch: 'venda', cat: 'venda' },
  'bonus-06': { branch: 'cobertura', cat: 'cardapio' },
  'bonus-07': { branch: 'venda', cat: 'venda' },
  'bonus-08': { branch: 'massa', cat: 'cardapio' },
  'receitas-explodir-vendas': { branch: 'venda', cat: 'venda' },
  'dia-producao-escala': { branch: 'venda', cat: 'venda' },
  'kit-lucrativo': { branch: 'venda', cat: 'venda' },
  'kit-embalagem-etiqueta': { branch: 'embalagem', cat: 'venda' },
  'fornada-pascoa': { branch: 'massa', cat: 'recheado' },
  'ano-inteiro-encomendas': { branch: 'venda', cat: 'venda' },
}
export const metaOf = (id: string): { branch: Branch; cat: CatId } => GAME_ITEMS[id as ItemId] ?? { branch: 'massa', cat: 'classico' }

// ------------------------------------------------------------ selos
export type SealIcon = 'aprendiz' | 'fornada' | 'confeiteira' | 'mestra' | 'receita' | 'casa' | 'sequencia' | 'desafio' | 'socorro' | 'encomenda' | 'conta' | 'presente' | 'variedade' | 'contas' | 'venda' | 'madrugadora' | 'lua' | 'domingo' | 'tarde' | 'album' | 'volta' | 'natal' | 'constancia' | 'cozinha'
// nomes dos arquivos de imagem prontos para trocar o desenho simples (SVG) quando existirem em public/selos/<arquivo>.webp
export const SEAL_FILES: Record<SealIcon, string | null> = {
  aprendiz: 's01-aprendiz',
  fornada: 's02-fornada',
  confeiteira: 's03-confeiteira',
  mestra: 's04-mestra',
  receita: 's05-receita-feita',
  casa: null,
  sequencia: 's06-sequencia',
  desafio: 's07-desafio',
  socorro: 's08-socorro',
  encomenda: 's09-primeira-encomenda',
  conta: 's10-fiz-minha-conta',
  presente: null,
  variedade: null,
  contas: 's11-conta-5-receitas', // arte pedida ao GPT (IMAGENS-FALTANDO.md); enquanto não existir, o desenho SVG funciona
  venda: 's12-primeira-venda-anotada', // conquista "Primeira venda anotada" do Diário de vendas
  // selos surpresa: ainda sem arte; o desenho SVG funciona (pedidos ao GPT em IMAGENS-FALTANDO.md)
  madrugadora: null,
  lua: null,
  domingo: null,
  tarde: null,
  album: null,
  volta: null,
  natal: null,
  constancia: null,
  cozinha: null,
}
export const SOCORRO_TIPOS = [
  { id: 'massa-nao-cresce', name: 'Massa que não cresce' },
  { id: 'recheio-mole', name: 'Recheio que escorre' },
  { id: 'panetone-afundou', name: 'Panetone que afundou' },
  { id: 'cobertura-rachou', name: 'Cobertura que rachou' },
  { id: 'miolo-seco', name: 'Miolo seco' },
] as const

export interface SealDef {
  id: string
  name: string
  how: string
  icon: SealIcon
  gold?: boolean
  /** selo surpresa: só aparece na estante depois de conquistado */
  hidden?: boolean
  /** PF do selo surpresa */
  pf?: number
}
// 10 selos surpresa: ninguém vê a lista antes. Aparecem só depois de conquistados por uma ação real (nada de sorteio ou de dia especial inventado).
export const HIDDEN_SEALS: SealDef[] = [
  { id: 'presente', name: 'Fornada de presente', how: 'Você marcou uma fornada que fez para presentear.', icon: 'presente', hidden: true, pf: PF.presente },
  { id: 'h:madrugadora', name: 'Madrugadora', how: 'Você marcou uma receita antes das 7h da manhã.', icon: 'madrugadora', hidden: true, pf: PF.secreto },
  { id: 'h:noite', name: 'Fornada da noite', how: 'Você marcou uma receita depois das 21h.', icon: 'lua', hidden: true, pf: PF.secreto },
  { id: 'h:domingo', name: 'Fornada de domingo', how: 'Você marcou uma receita num domingo.', icon: 'domingo', hidden: true, pf: PF.secreto },
  { id: 'h:constancia', name: 'Constância', how: 'Você chegou a 14 dias de sequência.', icon: 'constancia', hidden: true, pf: PF.constancia },
  { id: 'h:cozinha-cheia', name: 'Cozinha cheia', how: 'Você marcou 10 fornadas no Livro de Fornadas.', icon: 'cozinha', hidden: true, pf: PF.secreto },
  { id: 'h:tarde-cheia', name: 'Tarde cheia', how: 'Você fez 3 receitas diferentes no mesmo dia.', icon: 'tarde', hidden: true, pf: PF.secreto },
  { id: 'h:album', name: 'Álbum de fornadas', how: 'Você guardou 5 fotos de fornadas.', icon: 'album', hidden: true, pf: PF.secreto },
  { id: 'h:volta', name: 'Volta por cima', how: 'Você voltou a cozinhar depois de uma semana sem marcar receita.', icon: 'volta', hidden: true, pf: PF.secreto },
  { id: 'h:natal', name: 'Fornada de Natal', how: 'Você marcou uma receita entre 20 e 25 de dezembro.', icon: 'natal', hidden: true, pf: PF.secreto },
]
export const hiddenSealIds = (): string[] => HIDDEN_SEALS.map((x) => x.id)

export const STATIC_SEALS: SealDef[] = [
  { id: 'nivel:0', name: 'Aprendiz', how: 'Você começou. Já é um selo.', icon: 'aprendiz' },
  { id: 'nivel:1', name: 'Fornada', how: 'Chegue a 100 PF.', icon: 'fornada' },
  { id: 'nivel:2', name: 'Confeiteira', how: 'Chegue a 300 PF.', icon: 'confeiteira' },
  { id: 'nivel:3', name: 'Mestra do Panetone', how: 'Chegue a 700 PF.', icon: 'mestra' },
  { id: 'seq3', name: 'Três dias na cozinha', how: 'Marque algo como feito em 3 dias seguidos (o dia de descanso vale).', icon: 'sequencia' },
  { id: 'seq7', name: 'Semana na cozinha', how: 'Chegue a 7 dias de sequência.', icon: 'sequencia' },
  { id: 'desafio1', name: 'Primeiro desafio', how: 'Conclua um desafio da semana.', icon: 'desafio' },
  { id: 'desafio3', name: 'Semana completa', how: 'Conclua os 3 desafios de uma semana.', icon: 'desafio' },
  ...SOCORRO_TIPOS.map((t): SealDef => ({ id: `socorro:${t.id}`, name: `Salvei a fornada: ${t.name}`, how: 'Use uma Ficha de Socorro e marque "Resolveu".', icon: 'socorro' })),
  { id: 'enc1', name: 'Minha primeira encomenda', how: 'Registre a primeira encomenda no caderno.', icon: 'encomenda' },
  { id: 'conta', name: 'Fiz minha conta', how: 'Marque no Bônus 07 que você calculou o custo da sua fornada.', icon: 'conta' },
  { id: 'conta5', name: 'Conta de 5 receitas', how: 'Termine a conta de 5 receitas diferentes na Conta da Fornada.', icon: 'contas' },
  { id: 'venda1', name: 'Primeira venda anotada', how: 'Anote a primeira venda no Diário de vendas (só os números que você digitar).', icon: 'venda' },
  ...HIDDEN_SEALS,
  { id: 'var3', name: 'Variedade: 3 tipos', how: 'Faça materiais de 3 categorias diferentes.', icon: 'variedade' },
  { id: 'var5', name: 'Variedade: 5 tipos', how: 'Faça materiais de 5 categorias diferentes.', icon: 'variedade' },
  { id: 'var8', name: 'Variedade: 8 tipos', how: 'Faça materiais de 8 categorias diferentes.', icon: 'variedade' },
]
export function sealDef(id: string, titleOf: (item: string) => string): SealDef | null {
  const st = STATIC_SEALS.find((s) => s.id === id)
  if (st) return st
  if (id.startsWith('r:')) return { id, name: titleOf(id.slice(2)), how: 'Toque em "Fiz essa" neste material.', icon: 'receita' }
  if (id.startsWith('casa:')) return { id, name: `Receita de casa: ${titleOf(id.slice(5))}`, how: 'Faça a mesma receita 3 vezes.', icon: 'casa', gold: true }
  return null
}

// ------------------------------------------------------------ estado
export interface PfEntry {
  d: string
  k: string
  pf: number
  txt: string
  item?: string
}
export interface Fornada {
  id: string
  item: string
  d: string
  nota?: number
  texto?: string
  foto?: boolean
  presente?: boolean
}
export interface Encomenda {
  id: string
  nome: string
  sabor: string
  qtd: number
  entrega: string
  entregue: boolean
}
export interface Streak {
  dias: number
  ultimoDia: string | null
  descansoSemana: string | null
  bonus3: boolean
  bonus7: boolean
  melhor: number
  recomecou: boolean
}
export interface GameState {
  v: 1
  pf: number
  pfLog: PfEntry[]
  level: number
  levelCard: number | null // nível recém-alcançado, cartão de parabéns ainda não fechado
  seals: Record<string, string> // id do selo -> data
  streak: Streak
  challenges: { semana: string; itens: string[]; feitos: string[]; todos: boolean }
  fornadas: Fornada[]
  encomendas: Encomenda[]
  metaEncomendas: number | null
  branch: Record<Branch, number>
  fav: string[]
  metaDia: { d: string; feita: boolean }
  ultimaVisita: string | null
  ultimoItem: string | null
  ingr: Record<string, { extra: string[]; marcados: string[] }>
  extrasVistos: string[]
  ack: string | null
  config: { gamificacao: boolean; sequencia: boolean; avisos: boolean; festa: boolean }
  semPressao: boolean
  contas?: Record<string, string> // Conta da Fornada: receita (número ou "livre") -> dia em que a primeira conta dela foi concluída
  missoes?: { d: string; itens: string[]; feitos: string[]; todas: boolean } // missões do dia (lista fixa do app)
  desbloqueados?: string[] // extras do app já liberados por progresso: nunca voltam a trancar
  rank?: { on: boolean; apelido: string } // ranking anônimo semanal: só vale se a cliente entrou; o servidor guarda o resto
}

export const emptyGame = (today: string): GameState => ({
  v: 1,
  pf: 0,
  pfLog: [],
  level: 0,
  levelCard: null,
  seals: { 'nivel:0': today },
  streak: { dias: 0, ultimoDia: null, descansoSemana: null, bonus3: false, bonus7: false, melhor: 0, recomecou: false },
  challenges: { semana: '', itens: [], feitos: [], todos: false },
  fornadas: [],
  encomendas: [],
  metaEncomendas: null,
  branch: { massa: 0, recheio: 0, cobertura: 0, embalagem: 0, venda: 0 },
  fav: [],
  metaDia: { d: '', feita: false },
  ultimaVisita: null,
  ultimoItem: null,
  ingr: {},
  extrasVistos: [],
  ack: null,
  config: { gamificacao: true, sequencia: true, avisos: false, festa: true },
  semPressao: false,
})

export interface Res {
  st: GameState
  msgs: string[]
}
const clone = (s: GameState): GameState => structuredClone(s)

// ------------------------------------------------------------ pontos com teto diário
export const pfOnDay = (st: GameState, d: string): number => st.pfLog.filter((e) => e.d === d).reduce((t, e) => t + e.pf, 0)
const countKey = (st: GameState, d: string, prefix: string): number => st.pfLog.filter((e) => e.d === d && e.k.startsWith(prefix)).length
export const hasOnce = (st: GameState, k: string): boolean => st.pfLog.some((e) => e.k === k)

// devolve quantos PF entraram. O teto de 60 PF vale para tudo (a cliente não perde nada por chegar nele: o resto simplesmente não conta hoje).
function award(st: GameState, msgs: string[], d: string, k: string, pf: number, txt: string, item?: string): number {
  const room = Math.max(0, DAILY_CAP - pfOnDay(st, d))
  const got = Math.min(pf, room)
  if (got <= 0) {
    msgs.push(`Você chegou ao teto de ${DAILY_CAP} PF de hoje. Amanhã tem mais.`)
    return 0
  }
  st.pfLog.push({ d, k, pf: got, txt: got < pf ? `${txt} (teto do dia)` : txt, ...(item ? { item } : {}) })
  st.pf += got
  msgs.push(`+${got} PF: ${txt}`)
  const idx = levelIndex(st.pf)
  if (idx > st.level) {
    st.level = idx
    st.levelCard = idx
    st.seals[`nivel:${idx}`] = d
    msgs.push(levelUpText(idx))
  }
  return got
}
const seal = (st: GameState, msgs: string[], id: string, d: string, name: string): void => {
  if (st.seals[id]) return
  st.seals[id] = d
  msgs.push(`Selo conquistado: ${name}.`)
}

const surprise = (st: GameState, msgs: string[], id: string, d: string): void => {
  if (st.seals[id]) return
  const def = HIDDEN_SEALS.find((x) => x.id === id)
  if (!def) return
  st.seals[id] = d
  msgs.push(`Selo surpresa conquistado: ${def.name}.`)
  award(st, msgs, d, id, def.pf ?? PF.secreto, `Selo surpresa: ${def.name}`)
}

// ------------------------------------------------------------ desafios semanais (lista FIXA do app, nunca inventada na hora)
export interface ChallengeDef {
  id: string
  ev: string
  txt: string
  needsBump?: boolean
  needsTool?: boolean // precisa da Conta da Fornada (comprada ou com a rodada grátis)
}
export const CHALLENGES: ChallengeDef[] = [
  { id: 'nova', ev: 'nova', txt: 'Faça uma receita nova' },
  { id: 'foto', ev: 'foto', txt: 'Tire uma foto da fornada' },
  { id: 'nota', ev: 'nota', txt: 'Anote como ficou uma fornada' },
  { id: 'socorro', ev: 'socorro', txt: 'Use uma Ficha de Socorro e conte se resolveu', needsBump: true },
  { id: 'redo', ev: 'redo', txt: 'Refaça uma receita que você já fez' },
  { id: 'ingr', ev: 'ingr', txt: 'Separe os ingredientes antes de começar' },
  { id: 'enc', ev: 'enc', txt: 'Registre uma encomenda no caderno' },
  { id: 'fav', ev: 'fav', txt: 'Marque uma receita como favorita' },
  { id: 'meta', ev: 'meta', txt: 'Cumpra a meta do dia' },
  { id: 'conta', ev: 'conta', txt: 'Faça uma conta na Conta da Fornada', needsTool: true },
]
export const challengeById = (id: string): ChallengeDef | undefined => CHALLENGES.find((c) => c.id === id)
export function pickChallenges(week: string, hasBump: boolean, hasTool = false): string[] {
  const pool = CHALLENGES.filter((c) => (!c.needsBump || hasBump) && (!c.needsTool || hasTool))
  const start = (weekIndex(week) * 3) % pool.length
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length].id)
}
function ensureWeek(st: GameState, today: string, hasBump: boolean, hasTool = false): void {
  const w = weekKey(today)
  if (st.challenges.semana !== w) st.challenges = { semana: w, itens: pickChallenges(w, hasBump, hasTool), feitos: [], todos: false }
}
function challengeEv(st: GameState, msgs: string[], d: string, ev: string): void {
  missionEv(st, msgs, d, ev)
  const c = st.challenges
  for (const id of c.itens) {
    const def = challengeById(id)
    if (!def || def.ev !== ev || c.feitos.includes(id)) continue
    c.feitos.push(id)
    award(st, msgs, d, `desafio:${c.semana}:${id}`, PF.desafio, `Desafio: ${def.txt}`)
    seal(st, msgs, 'desafio1', d, 'Primeiro desafio')
    if (c.feitos.length === c.itens.length && !c.todos) {
      c.todos = true
      award(st, msgs, d, `desafio-todos:${c.semana}`, PF.desafioTodos, 'Os 3 desafios da semana')
      seal(st, msgs, 'desafio3', d, 'Semana completa')
    }
  }
}

// ------------------------------------------------------------ sequência com 1 dia de descanso por semana (pode ser desligada)
function touchStreak(st: GameState, msgs: string[], d: string): void {
  if (!st.config.sequencia) return
  const s = st.streak
  if (s.ultimoDia === d) return
  if (!s.ultimoDia) {
    s.dias = 1
  } else {
    const gap = diffDays(s.ultimoDia, d)
    const skipped = addDays(s.ultimoDia, 1)
    if (gap === 1) s.dias += 1
    else if (gap === 2 && s.descansoSemana !== weekKey(skipped)) {
      s.dias += 1
      s.descansoSemana = weekKey(skipped)
      msgs.push('Dia de descanso usado: a sua sequência continua.')
    } else {
      s.dias = 1
      s.bonus3 = false
      s.bonus7 = false
      s.recomecou = true // mostra "recomeço", nunca "zero"
      msgs.push('Recomeço: hoje começa uma sequência nova.')
    }
  }
  s.ultimoDia = d
  s.melhor = Math.max(s.melhor, s.dias)
  if (s.dias >= 3 && !s.bonus3) {
    s.bonus3 = true
    award(st, msgs, d, `seq3:${d}`, PF.seq3, '3 dias seguidos na cozinha')
    seal(st, msgs, 'seq3', d, 'Três dias na cozinha')
  }
  if (s.dias >= 7 && !s.bonus7) {
    s.bonus7 = true
    award(st, msgs, d, `seq7:${d}`, PF.seq7, '7 dias de sequência')
    seal(st, msgs, 'seq7', d, 'Semana na cozinha')
  }
  if (s.dias >= 14) surprise(st, msgs, 'h:constancia', d)
}
export interface StreakView {
  dias: number
  texto: string
}
export function streakView(st: GameState, today: string): StreakView {
  const s = st.streak
  if (!s.ultimoDia) return { dias: 0, texto: 'Marque uma receita como feita para começar a sua sequência.' }
  const gap = diffDays(s.ultimoDia, today)
  const restOk = s.descansoSemana !== weekKey(addDays(s.ultimoDia, 1))
  if (gap <= 1 || (gap === 2 && restOk)) return { dias: s.dias, texto: `${s.dias} ${s.dias === 1 ? 'dia' : 'dias'} na cozinha. Dia de descanso também vale.` }
  return { dias: 0, texto: 'Recomeço: marque uma receita hoje para começar uma sequência nova. Sem culpa.' }
}

// ------------------------------------------------------------ ações da cliente (cada uma devolve um estado novo e as mensagens)
export interface BaseCtx {
  today: string
  hasBump?: boolean
  contaOk?: boolean // pode fazer conta na Conta da Fornada (comprou ou ainda tem a rodada grátis)
  hour?: number // hora local (0 a 23) de quando a cliente marcou; só os selos de horário usam
}
export interface DoneCtx extends BaseCtx {
  item: string
  title: string
  id: string // id novo da fornada
  trailStage?: boolean // o material é uma etapa de "Seu caminho"
  sugestao?: string | null // item da "Sugestão da semana"
}

export function categoriesDone(st: GameState): number {
  return new Set(st.fornadas.map((f) => metaOf(f.item).cat)).size
}
export const makesOf = (st: GameState, item: string): number => st.fornadas.filter((f) => f.item === item).length

// "Fiz essa" e "Fiz de novo"
export function onDone(inp: GameState, c: DoneCtx): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  // no mesmo dia, a mesma receita conta uma vez
  if (st.fornadas.some((f) => f.item === c.item && f.d === c.today)) return { st: inp, msgs }
  const before = makesOf(st, c.item)
  const anterior = st.fornadas.length ? st.fornadas[st.fornadas.length - 1].d : null
  st.fornadas.push({ id: c.id, item: c.item, d: c.today })
  const m = metaOf(c.item)
  st.branch[m.branch] += 2
  st.ultimoItem = c.item
  if (before === 0) {
    award(st, msgs, c.today, `feita:${c.item}`, PF.feita, `Fiz ${c.title}`, c.item)
    seal(st, msgs, `r:${c.item}`, c.today, c.title)
    challengeEv(st, msgs, c.today, 'nova')
    if (c.trailStage && !hasOnce(st, `etapa:${c.item}`)) award(st, msgs, c.today, `etapa:${c.item}`, PF.etapa, `Etapa concluída: ${c.title}`, c.item)
  } else {
    if (countKey(st, c.today, 'refeita:') === 0) award(st, msgs, c.today, `refeita:${c.item}:${before + 1}`, PF.refeita, `Fiz de novo ${c.title}`, c.item)
    challengeEv(st, msgs, c.today, 'redo')
  }
  if (before + 1 === 3) {
    seal(st, msgs, `casa:${c.item}`, c.today, `Receita de casa: ${c.title}`)
    award(st, msgs, c.today, `casa:${c.item}`, PF.casa, `Receita de casa: ${c.title}`, c.item)
  }
  // checklist de ingredientes completo antes da receita
  const ck = st.ingr[c.item]
  if (ck && checklistComplete(ck)) {
    award(st, msgs, c.today, `ingr:${c.item}:${before + 1}`, PF.ingredientes, 'Ingredientes separados antes de começar', c.item)
    challengeEv(st, msgs, c.today, 'ingr')
    st.ingr[c.item] = { extra: ck.extra, marcados: [] }
  }
  if (c.sugestao && c.sugestao === c.item && !hasOnce(st, `sug:${weekKey(c.today)}`)) award(st, msgs, c.today, `sug:${weekKey(c.today)}`, PF.sugestao, 'Sugestão da semana feita', c.item)
  touchStreak(st, msgs, c.today)
  surprisesOnDone(st, msgs, c, anterior)
  const cats = categoriesDone(st)
  for (const n of [3, 5, 8]) if (cats >= n && !hasOnce(st, `var${n}`)) {
    award(st, msgs, c.today, `var${n}`, PF.variedade, `Variedade: ${n} tipos`)
    seal(st, msgs, `var${n}`, c.today, `Variedade: ${n} tipos`)
  }
  return { st, msgs }
}

// "Como ficou?": nota, anotação e foto são opcionais
export function onNote(inp: GameState, c: BaseCtx & { id: string; nota?: number; texto?: string; foto?: boolean }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  const f = st.fornadas.find((x) => x.id === c.id)
  if (!f) return { st: inp, msgs }
  if (c.nota !== undefined) f.nota = Math.max(1, Math.min(5, Math.round(c.nota)))
  if (c.texto !== undefined) f.texto = c.texto.trim().slice(0, 280)
  if (c.foto !== undefined) f.foto = c.foto
  if (f.texto && !hasOnce(st, `nota:${f.id}`)) {
    award(st, msgs, c.today, `nota:${f.id}`, PF.nota, 'Anotação da fornada', f.item)
    challengeEv(st, msgs, c.today, 'nota')
  }
  if (f.foto && !hasOnce(st, `foto:${f.id}`)) {
    award(st, msgs, c.today, `foto:${f.id}`, PF.foto, 'Foto da fornada', f.item)
    challengeEv(st, msgs, c.today, 'foto')
  }
  if (st.fornadas.filter((x) => x.foto).length >= 5) surprise(st, msgs, 'h:album', c.today)
  return { st, msgs }
}

export function onGift(inp: GameState, c: BaseCtx & { id: string; on: boolean }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  const f = st.fornadas.find((x) => x.id === c.id)
  if (!f) return { st: inp, msgs }
  f.presente = c.on
  if (c.on && !hasOnce(st, 'presente')) {
    surprise(st, msgs, 'presente', c.today)
  }
  return { st, msgs }
}

export function onSocorro(inp: GameState, c: BaseCtx & { tipo: string; resolveu: boolean }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  const t = SOCORRO_TIPOS.find((x) => x.id === c.tipo)
  if (!t) return { st: inp, msgs }
  if (!c.resolveu) {
    msgs.push('Anotado. Releia a ficha com calma ou fale com o suporte pelo botão Ajuda.')
    return { st, msgs }
  }
  if (countKey(st, c.today, 'socorro:') >= SOCORRO_PER_DAY) {
    msgs.push('Fornada salva! Hoje já contamos 2 fichas, as próximas contam amanhã.')
    return { st, msgs }
  }
  award(st, msgs, c.today, `socorro:${t.id}:${c.today}:${countKey(st, c.today, 'socorro:') + 1}`, PF.socorro, `Salvei a fornada: ${t.name}`)
  seal(st, msgs, `socorro:${t.id}`, c.today, `Salvei a fornada: ${t.name}`)
  challengeEv(st, msgs, c.today, 'socorro')
  touchStreak(st, msgs, c.today)
  return { st, msgs }
}

// ---- meta do dia (+2 PF), favoritas, "Fiz minha conta"
export const DAILY_GOALS = [
  'Separe os ingredientes de amanhã',
  'Leia uma receita até o fim, sem pressa',
  'Confira se o forno e as formas estão limpos',
  'Anote uma dúvida que você teve na última fornada',
  'Pese e separe a farinha de uma receita',
  'Deixe manteiga e ovos em temperatura ambiente para a próxima fornada',
  'Escolha a receita da próxima fornada',
  'Releia uma anotação de uma fornada anterior',
  'Separe forminhas e embalagens',
  'Limpe e organize a bancada onde você trabalha',
]
export const dailyGoalOf = (today: string): string => DAILY_GOALS[dayNum(today) % DAILY_GOALS.length]
export function onMetaDia(inp: GameState, c: BaseCtx): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  if (st.metaDia.d === c.today && st.metaDia.feita) return { st: inp, msgs }
  st.metaDia = { d: c.today, feita: true }
  award(st, msgs, c.today, `meta:${c.today}`, PF.metaDia, 'Meta do dia')
  challengeEv(st, msgs, c.today, 'meta')
  return { st, msgs }
}
export function onFav(inp: GameState, c: BaseCtx & { item: string; title: string }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  if (st.fav.includes(c.item)) {
    st.fav = st.fav.filter((x) => x !== c.item)
  } else {
    st.fav.push(c.item)
    msgs.push(`Salva nas suas favoritas: ${c.title}.`)
    challengeEv(st, msgs, c.today, 'fav')
  }
  return { st, msgs }
}
export function onConta(inp: GameState, c: BaseCtx): Res {
  const st = clone(inp)
  const msgs: string[] = []
  if (hasOnce(st, 'conta')) return { st: inp, msgs }
  award(st, msgs, c.today, 'conta', PF.conta, 'Fiz minha conta')
  seal(st, msgs, 'conta', c.today, 'Fiz minha conta')
  msgs.push('Você calculou o custo da sua fornada.')
  return { st, msgs }
}

// Conta da Fornada: ao CONCLUIR uma conta. "Fiz minha conta" (+15 PF, selo, uma vez, igual ao botão do Bônus 07), +5 PF por receita DIFERENTE
// (no máximo 2 por dia, dentro do teto), selo "Conta de 5 receitas" (+10 PF) Também cumpre o desafio da semana e a missão do dia "faça uma conta", se estiverem na lista. Abrir, ver prévia ou mudar número: 0 PF.
export function onContaFeita(inp: GameState, c: BaseCtx & { receita: number | null }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, true)
  ensureDay(st, { ...c, contaOk: true })
  if (!hasOnce(st, 'conta')) {
    award(st, msgs, c.today, 'conta', PF.conta, 'Fiz minha conta')
    seal(st, msgs, 'conta', c.today, 'Fiz minha conta')
  }
  const key = c.receita === null ? 'livre' : String(c.receita)
  const contas = (st.contas ??= {})
  if (c.receita !== null && !(key in contas)) {
    const hoje = Object.values(contas).filter((d) => d === c.today).length
    if (hoje < CONTA_POR_DIA) {
      contas[key] = c.today
      award(st, msgs, c.today, `conta-rec:${key}`, PF.contaReceita, 'Conta de uma receita nova')
    } else {
      contas[key] = c.today // a receita já conta para o selo; os pontos do dia acabaram
    }
    if (Object.keys(contas).length >= 5 && !st.seals.conta5) {
      seal(st, msgs, 'conta5', c.today, 'Conta de 5 receitas')
      award(st, msgs, c.today, 'conta5', PF.conta5, 'Conta de 5 receitas')
    }
  }
  challengeEv(st, msgs, c.today, 'conta') // desafio da semana e missão do dia "faça uma conta"
  return { st, msgs }
}

// ---- selos surpresa de ação real: hora, dia da semana, data, volume
function surprisesOnDone(st: GameState, msgs: string[], c: DoneCtx, anterior: string | null): void {
  if (c.hour !== undefined) {
    if (c.hour < 7) surprise(st, msgs, 'h:madrugadora', c.today)
    if (c.hour >= 21) surprise(st, msgs, 'h:noite', c.today)
  }
  const [y, m, d] = c.today.split('-').map(Number)
  if (new Date(y, m - 1, d).getDay() === 0) surprise(st, msgs, 'h:domingo', c.today)
  if (m === 12 && d >= 20 && d <= 25) surprise(st, msgs, 'h:natal', c.today)
  if (new Set(st.fornadas.filter((f) => f.d === c.today).map((f) => f.item)).size >= 3) surprise(st, msgs, 'h:tarde-cheia', c.today)
  if (st.fornadas.length >= 10) surprise(st, msgs, 'h:cozinha-cheia', c.today)
  if (anterior && diffDays(anterior, c.today) >= 7) surprise(st, msgs, 'h:volta', c.today)
}

// ------------------------------------------------------------ missões do dia (3 por dia, de uma lista fixa, só por ação real)
export interface MissionDef {
  id: string
  ev: string
  txt: string
  need?: 'conta' | 'bump' | 'extra'
}
export const MISSIONS: MissionDef[] = [
  { id: 'feita', ev: 'feita', txt: 'Faça uma receita e marque "Fiz essa"' },
  { id: 'nota', ev: 'nota', txt: 'Anote como ficou uma fornada' },
  { id: 'conta', ev: 'conta', txt: 'Faça uma conta na Conta da Fornada', need: 'conta' },
  { id: 'extra', ev: 'extra', txt: 'Abra um extra do app', need: 'extra' },
  { id: 'foto', ev: 'foto', txt: 'Tire uma foto de uma fornada' },
  { id: 'ingr', ev: 'ingr', txt: 'Separe os ingredientes antes de começar uma receita' },
  { id: 'fav', ev: 'fav', txt: 'Marque uma receita como favorita' },
  { id: 'socorro', ev: 'socorro', txt: 'Use uma Ficha de Socorro e conte se resolveu', need: 'bump' },
]
export const missionById = (id: string): MissionDef | undefined => MISSIONS.find((m) => m.id === id)
export const MISSION_MAX = 3 * PF.missao + PF.missaoTodas // 18 PF por dia, sempre dentro do teto de 60
export function pickMissions(today: string, can: { bump: boolean; conta: boolean; extra: boolean }): string[] {
  const pool = MISSIONS.filter((m) => m.need !== 'bump' || can.bump).filter((m) => m.need !== 'conta' || can.conta).filter((m) => m.need !== 'extra' || can.extra)
  const n = pool.length
  const step = n <= 4 ? 1 : Math.ceil(n / 3)
  const start = dayNum(today) % n
  return [0, 1, 2].map((i) => pool[(start + i * step) % n].id)
}
const canMissions = (st: GameState, c: BaseCtx) => ({ bump: !!c.hasBump, conta: !!c.contaOk, extra: EXTRAS.some((e) => extraUnlocked(e, st)) })
function ensureDay(st: GameState, c: BaseCtx): void {
  if (st.missoes?.d === c.today) return
  st.missoes = { d: c.today, itens: pickMissions(c.today, canMissions(st, c)), feitos: [], todas: false }
}
/** as missões de hoje; se o dia ainda não foi gravado, calcula a mesma lista (determinística) */
export function missionsToday(st: GameState, c: BaseCtx): { itens: string[]; feitos: string[]; todas: boolean } {
  if (st.missoes?.d === c.today) return st.missoes
  return { itens: pickMissions(c.today, canMissions(st, c)), feitos: [], todas: false }
}
export function startDay(inp: GameState, c: BaseCtx): GameState {
  if (inp.missoes?.d === c.today) return inp
  const st = clone(inp)
  ensureDay(st, c)
  return st
}
function missionEv(st: GameState, msgs: string[], d: string, ev: string): void {
  const m = st.missoes
  if (!m || m.d !== d) return
  const e = ev === 'nova' || ev === 'redo' ? 'feita' : ev
  for (const id of m.itens) {
    const def = missionById(id)
    if (!def || def.ev !== e || m.feitos.includes(id)) continue
    m.feitos.push(id)
    award(st, msgs, d, `missao:${d}:${id}`, PF.missao, `Missão do dia: ${def.txt}`)
    if (m.feitos.length === m.itens.length && !m.todas) {
      m.todas = true
      award(st, msgs, d, `missao-todas:${d}`, PF.missaoTodas, 'As 3 missões de hoje')
      msgs.push('Missões de hoje completas. Descanse ou siga no seu ritmo.')
    }
  }
}
/** abrir um extra do app (leitura): vale como missão uma vez por dia */
export function onExtraAberto(inp: GameState, c: BaseCtx): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureDay(st, c)
  missionEv(st, msgs, c.today, 'extra')
  return msgs.length ? { st, msgs } : { st: inp, msgs }
}

// ---- checklist de ingredientes
export const BASE_CHECKLIST = ['Receita lida até o fim', 'Ingredientes pesados e separados', 'Forma e forminhas prontas', 'Forno e bancada livres', 'Tempo reservado para a fornada']
export const checklistItems = (ck?: { extra: string[] }): string[] => [...BASE_CHECKLIST, ...(ck?.extra ?? [])]
export const checklistComplete = (ck: { extra: string[]; marcados: string[] }): boolean => {
  const all = checklistItems(ck)
  return all.length > 0 && all.every((t) => ck.marcados.includes(t))
}
export function setChecklist(inp: GameState, item: string, patch: { toggle?: string; add?: string; remove?: string }): GameState {
  const st = clone(inp)
  const ck = st.ingr[item] ?? { extra: [], marcados: [] }
  if (patch.add) {
    const t = patch.add.trim().slice(0, 60)
    if (t && !checklistItems(ck).includes(t) && ck.extra.length < 20) ck.extra.push(t)
  }
  if (patch.remove) {
    ck.extra = ck.extra.filter((x) => x !== patch.remove)
    ck.marcados = ck.marcados.filter((x) => x !== patch.remove)
  }
  if (patch.toggle) ck.marcados = ck.marcados.includes(patch.toggle) ? ck.marcados.filter((x) => x !== patch.toggle) : [...ck.marcados, patch.toggle]
  st.ingr[item] = ck
  return st
}

// ---- caderno de encomendas (sem valores, sem cálculo)
export function onEncomenda(inp: GameState, c: BaseCtx & { id: string; nome: string; sabor: string; qtd: number; entrega: string }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  const first = st.encomendas.length === 0
  st.encomendas.push({ id: c.id, nome: c.nome.trim().slice(0, 60), sabor: c.sabor.trim().slice(0, 60), qtd: Math.max(1, Math.min(999, Math.round(c.qtd) || 1)), entrega: c.entrega, entregue: false })
  if (first && !hasOnce(st, 'enc1')) {
    award(st, msgs, c.today, 'enc1', PF.primeiraEncomenda, 'Minha primeira encomenda')
    seal(st, msgs, 'enc1', c.today, 'Minha primeira encomenda')
    msgs.push('Primeira encomenda registrada! Cada entrega conta.')
  }
  challengeEv(st, msgs, c.today, 'enc')
  return { st, msgs }
}
export function onEntregue(inp: GameState, c: BaseCtx & { id: string }): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  const e = st.encomendas.find((x) => x.id === c.id)
  if (!e) return { st: inp, msgs }
  e.entregue = !e.entregue
  if (e.entregue && !hasOnce(st, `ent:${e.id}`)) {
    if (countKey(st, c.today, 'ent:') < DELIVERED_PER_DAY) {
      award(st, msgs, c.today, `ent:${e.id}`, PF.entregue, 'Encomenda entregue')
    } else msgs.push(`Entrega anotada. Hoje já contamos ${DELIVERED_PER_DAY} entregas em pontos.`)
    touchStreak(st, msgs, c.today)
  }
  return { st, msgs }
}
export const entreguesOf = (st: GameState): number => st.encomendas.filter((e) => e.entregue).length

// ---- configurações e apagar tudo
export function setConfig(inp: GameState, patch: Partial<GameState['config']> & { semPressao?: boolean }): GameState {
  const st = clone(inp)
  const { semPressao, ...cfg } = patch
  st.config = { ...st.config, ...cfg }
  if (semPressao !== undefined) st.semPressao = semPressao
  return st
}
export const eraseAll = (today: string): GameState => emptyGame(today)

// ------------------------------------------------------------ sugestão da semana (da lista fixa, só entre o que a cliente já tem)
export function suggestionOf(week: string, owned: string[]): { item: string; reason: string } | null {
  const pool = (Object.keys(GAME_ITEMS) as ItemId[]).filter((id) => owned.includes(id))
  if (pool.length === 0) return null
  const item = pool[weekIndex(week) % pool.length]
  return { item, reason: CAT_REASON[metaOf(item).cat] }
}

// ------------------------------------------------------------ extras do app liberados por progresso (nunca por gastar PF, nunca no que a cliente comprou)
export type ExtraReq = { t: 'level' | 'fornadas' | 'dias' | 'selos' | 'contas'; n: number }
export interface Extra {
  id: string
  title: string
  kind: 'Ficha extra' | 'Mini-guia' | 'Guia final'
  req: ExtraReq
  blocks: { h: string; p?: string; ul?: string[] }[]
}
export const EXTRAS: Extra[] = [
  {
    id: 'ficha-recheio-mole',
    title: 'Recheio que escorre ou fica mole',
    kind: 'Ficha extra',
    req: { t: 'level', n: 1 },
    blocks: [
      { h: 'O que costuma acontecer', p: 'O recheio foi colocado quente ou muito mole, e a massa do panetone não segura. Ele escorre pelo corte, molha o miolo ou aparece no fundo da forma.' },
      { h: 'O que fazer antes de rechear', ul: ['Deixe o panetone esfriar por completo. Massa morna derrete o recheio.', 'Leve o creme, o brigadeiro ou a ganache ao ponto de pasta e, se precisar, descanse na geladeira por 15 a 20 minutos.', 'Recheie com saco de confeitar e bico fino, em pontos espaçados, sem encher até transbordar.'] },
      { h: 'Se já escorreu', ul: ['Limpe o excesso com papel e guarde o panetone na geladeira por 20 minutos antes de embalar.', 'Anote na sua fornada a textura do recheio para acertar na próxima.'] },
      { h: 'Lembrete', p: 'Cada receita tem a sua medida: use este texto como apoio e siga sempre a ficha da sua receita.' },
    ],
  },
  {
    id: 'guia-ponto-massa',
    title: 'Ponto da massa em 5 sinais',
    kind: 'Mini-guia',
    req: { t: 'level', n: 2 },
    blocks: [
      { h: 'Por que olhar os sinais', p: 'Tempo e temperatura mudam de cozinha para cozinha. O relógio ajuda, mas quem manda é a massa.' },
      { h: 'Os 5 sinais', ul: ['Textura: lisa, elástica e que solta da tigela.', 'Véu: ao esticar um pedacinho, ele fica fino e quase transparente sem rasgar.', 'Volume: cresceu de forma visível, sem pressa e sem passar do ponto.', 'Toque: ao apertar de leve com o dedo, a marca volta devagar.', 'Cheiro: de fermentação suave, sem azedo forte.'] },
      { h: 'Se faltar algum sinal', p: 'Dê mais tempo em um lugar sem corrente de ar e confira de novo. Anote o que você viu no Livro de Fornadas.' },
    ],
  },
  {
    id: 'guia-separar-tudo',
    title: 'Separe tudo antes: o passo a passo',
    kind: 'Mini-guia',
    req: { t: 'level', n: 2 },
    blocks: [
      { h: 'Antes de ligar o forno', ul: ['Leia a receita até o fim.', 'Pese tudo e separe em potinhos, na ordem de uso.', 'Deixe ovos e manteiga em temperatura ambiente, se a receita pedir.', 'Prepare forma, forminhas e a bancada.', 'Reserve o tempo inteiro da fornada, com as esperas.'] },
      { h: 'Durante', ul: ['Use um cronômetro para as esperas.', 'Anote qualquer ajuste que você fizer.'] },
      { h: 'Depois', p: 'Marque "Fiz essa" e conte como ficou. Na próxima, você faz melhor ainda.' },
    ],
  },
  {
    id: 'guia-fornada-do-dia',
    title: 'Checklist da fornada de encomenda',
    kind: 'Guia final',
    req: { t: 'level', n: 3 },
    blocks: [
      { h: 'Uma encomenda precisa de cuidado extra', p: 'Este guia é só organização. Ele não calcula nem promete ganho.' },
      { h: 'Antes', ul: ['Confirme sabor, quantidade, data e horário de entrega por mensagem.', 'Confira se você tem todos os ingredientes e embalagens.', 'Planeje a fornada com folga para a massa descansar.'] },
      { h: 'No dia', ul: ['Depois de assado, deixe o panetone esfriar bem antes de embalar.', 'Embale limpo e seco, com etiqueta de sabor e data de preparo.', 'Informe ingredientes que costumam causar alergia, como leite, ovos, glúten e castanhas.'] },
      { h: 'Depois', p: 'Marque a entrega no Caderno de encomendas e anote o que você ajustaria na próxima.' },
    ],
  },
  {
    id: 'guia-anotar-fornada',
    title: 'Como anotar uma fornada para aprender com ela',
    kind: 'Mini-guia',
    req: { t: 'fornadas', n: 1 },
    blocks: [
      { h: 'Por que anotar', p: 'A mesma receita muda de uma cozinha para outra, de um forno para outro, de um dia para outro. A anotação é o que transforma uma fornada em aprendizado.' },
      { h: 'O que vale registrar em 1 minuto', ul: ['O que você mudou em relação à receita (marca da farinha, tempo de descanso, forma usada).', 'Como estava a massa nos pontos principais: lisa, elástica, cresceu bem?', 'Como ficou o resultado: miolo, casca, sabor. Dê uma nota de 1 a 5 só para você.', 'Uma coisa para repetir e uma para ajustar na próxima.'] },
      { h: 'Foto ajuda', p: 'Uma foto do corte do panetone mostra o miolo melhor do que qualquer descrição. Ela fica só no seu aparelho.' },
    ],
  },
  {
    id: 'receita-creme-confeiteiro',
    title: 'Receita extra: creme de confeiteiro para rechear',
    kind: 'Ficha extra',
    req: { t: 'fornadas', n: 3 },
    blocks: [
      { h: 'Ingredientes (rende o suficiente para rechear alguns panetones pequenos)', ul: ['500 ml de leite integral', '4 gemas', '100 g de açúcar', '40 g de amido de milho', '1 colher de chá de baunilha (ou raspas de casca de limão)', '1 colher de sopa de manteiga, no final'] },
      { h: 'Modo de fazer', ul: ['Misture as gemas, o açúcar e o amido até ficar liso, sem grumos.', 'Aqueça o leite até soltar vapor, sem ferver. Despeje aos poucos sobre as gemas, mexendo sempre.', 'Volte tudo para a panela em fogo baixo e mexa sem parar até engrossar e dar uns borbulhos.', 'Desligue, junte a baunilha e a manteiga, e passe para uma tigela.', 'Cubra com filme tocando a superfície, para não criar película, e leve à geladeira até gelar por completo.'] },
      { h: 'Para rechear', p: 'Use o creme bem gelado, em saco de confeitar com bico fino, e recheie só depois de o panetone esfriar. Guarde na geladeira e use no mesmo dia ou no dia seguinte. Siga sempre a ficha da sua receita para a quantidade por panetone.' },
    ],
  },
  {
    id: 'receita-ganache-cobertura',
    title: 'Receita extra: ganache para cobertura e recheio',
    kind: 'Ficha extra',
    req: { t: 'fornadas', n: 5 },
    blocks: [
      { h: 'A ideia é só uma proporção', p: 'Ganache é chocolate picado derretido com creme de leite quente. Quem manda no ponto é a proporção entre os dois.' },
      { h: 'Duas proporções para guardar', ul: ['Recheio macio: 1 parte de chocolate para 1 parte de creme de leite (por peso).', 'Cobertura que firma: 2 partes de chocolate para 1 parte de creme de leite (por peso).'] },
      { h: 'Modo de fazer', ul: ['Pique o chocolate bem fininho (ou use gotas) e coloque em uma tigela.', 'Aqueça o creme de leite até começar a soltar vapor. Não deixe ferver forte.', 'Despeje sobre o chocolate, espere 1 minuto e mexa do centro para fora, devagar, até ficar liso e brilhante.', 'Para cobrir, use morna e fluida. Para rechear, deixe chegar ao ponto de pasta.'] },
      { h: 'Se talhou ou ficou duro', p: 'Se separou, junte um fio de creme de leite morno e mexa com paciência. Se firmou demais, aqueça em banho-maria por poucos segundos. Teste sempre em pouca quantidade antes de usar no panetone.' },
    ],
  },
  {
    id: 'guia-conhecer-forno',
    title: 'Conheça o seu forno em 3 testes simples',
    kind: 'Mini-guia',
    req: { t: 'fornadas', n: 10 },
    blocks: [
      { h: 'Cada forno tem seu jeito', p: 'O número no botão nem sempre é o calor real lá dentro. Conhecer o seu forno evita panetone cru no meio ou escuro demais por fora.' },
      { h: 'Os 3 testes', ul: ['Termômetro de forno (se tiver): compare o que ele mostra com a temperatura que você pediu e anote a diferença.', 'Pontos quentes: asse algo simples e observe qual lado dourou primeiro. Gire a forma na metade do tempo, se for o caso.', 'Prateleira: teste a forma no meio do forno primeiro. Perto demais da resistência, a parte de cima escurece antes.'] },
      { h: 'Anote', p: 'Escreva no Livro de Fornadas o que descobriu sobre o seu forno. Na próxima, você acerta mais rápido.' },
    ],
  },
  {
    id: 'guia-organizar-semana',
    title: 'Organize a semana de fornadas em 4 passos',
    kind: 'Mini-guia',
    req: { t: 'dias', n: 3 },
    blocks: [
      { h: 'Sem exagerar', p: 'Cozinhar com constância é melhor do que fazer tudo num dia só. Este guia é só organização, não é meta.' },
      { h: 'Os 4 passos', ul: ['Escolha o dia da semana em que você tem mais calma para a massa.', 'Na véspera, separe e pese os ingredientes e confira se a forma e o forno estão livres.', 'Reserve um dia diferente para embalar e outro para entregar, se houver encomenda.', 'No fim da semana, olhe o Livro de Fornadas e escolha uma coisa para ajustar.'] },
      { h: 'Lembrete', p: 'Se a semana apertar, tudo bem. A sua sequência tem um dia de descanso e o app não cobra nada de você.' },
    ],
  },
  {
    id: 'guia-conservar-panetone',
    title: 'Guardar o panetone: do forno ao dia seguinte',
    kind: 'Mini-guia',
    req: { t: 'selos', n: 4 },
    blocks: [
      { h: 'Esfriar primeiro', p: 'Embalar quente cria vapor, e o vapor deixa a casca mole e favorece mofo. Deixe esfriar por completo, em local arejado.' },
      { h: 'Para guardar', ul: ['Embale em saco próprio para alimento ou filme, bem fechado, e proteja da luz e do calor.', 'Panetone recheado com creme precisa de geladeira. Sem recheio perecível, ele fica bem em lugar fresco e seco.', 'Escreva a data e o sabor na embalagem.'] },
      { h: 'Na hora de servir', p: 'Se tirar da geladeira, espere chegar perto da temperatura ambiente. Para quem faz para vender ou presentear, informe sempre sabor, data e, em caso de dúvida, os ingredientes que podem causar alergia.' },
    ],
  },
  {
    id: 'guia-ler-custo',
    title: 'Como ler o custo da sua fornada, sem achismo',
    kind: 'Mini-guia',
    req: { t: 'contas', n: 1 },
    blocks: [
      { h: 'O que a conta mostra', p: 'A Conta da Fornada soma o que você digitou: ingredientes, embalagem e outros gastos. O app não sabe o preço da sua cidade e não sugere quanto cobrar.' },
      { h: 'Como ler', ul: ['Custo total: tudo o que você gastou com a fornada, com os números que você colocou.', 'Custo por unidade: o custo total dividido pelas unidades que saíram boas.', 'Se um número estiver velho, atualize o preço do ingrediente e refaça a conta.'] },
      { h: 'O preço é decisão sua', p: 'O app não promete ganho. Olhe o custo, pense no seu tempo e no que as pessoas da sua região pagam, e decida com calma. Anote no seu diário o que realmente vendeu.' },
    ],
  },
  {
    id: 'guia-ritmo-leve',
    title: 'Cozinhar sem pressa: um ritmo que cabe na sua semana',
    kind: 'Guia final',
    req: { t: 'dias', n: 7 },
    blocks: [
      { h: 'Constância não é correria', p: 'Quem chega a uma semana na cozinha já sabe: o que sustenta o hábito é um ritmo que cabe na vida, não a pressa.' },
      { h: 'Três ideias', ul: ['Faça menos, mas faça: uma receita bem feita vale mais do que três apressadas.', 'Deixe o app trabalhar para você: use o checklist e as anotações para não depender da memória.', 'Se um dia não deu, volte no seguinte. Pausa faz parte e ninguém cobra.'] },
      { h: 'Se quiser descansar', p: 'Em Minha conta você liga o modo sem pressão: pontos, ranking e placar saem da tela, e seus selos e o Livro de Fornadas continuam.' },
    ],
  },
]

/** números de progresso que abrem os extras (todos vêm de ações marcadas pela cliente) */
export interface Progress {
  level: number
  pf: number
  fornadas: number
  dias: number
  selos: number
  contas: number
}
export const progressOf = (st: GameState): Progress => ({
  level: st.level,
  pf: st.pf,
  fornadas: st.fornadas.length,
  dias: st.streak.melhor,
  selos: Object.keys(st.seals).filter((k) => !k.startsWith('nivel:')).length,
  contas: Object.keys(st.contas ?? {}).length,
})
const reqNow = (r: ExtraReq, p: Progress): number => (r.t === 'level' ? p.level : r.t === 'fornadas' ? p.fornadas : r.t === 'dias' ? p.dias : r.t === 'selos' ? p.selos : p.contas)
const reqMet = (e: Extra, p: Progress): boolean => reqNow(e.req, p) >= e.req.n
const reqPct = (e: Extra, p: Progress): number => {
  if (e.req.t === 'level') {
    const lv = LEVELS[e.req.n]
    return Math.max(0, Math.min(100, Math.round((p.pf / lv.min) * 100)))
  }
  return Math.max(0, Math.min(100, Math.round((reqNow(e.req, p) / e.req.n) * 100)))
}
const plr = (n: number, a: string, b: string): string => `${n} ${n === 1 ? a : b}`
/** o que falta, em palavras da cliente */
export function reqMissing(e: Extra, p: Progress): string {
  const r = e.req
  if (r.t === 'level') return `Faltam ${Math.max(0, LEVELS[r.n].min - p.pf)} PF para chegar a ${LEVELS[r.n].name}.`
  const f = Math.max(0, r.n - reqNow(r, p))
  if (r.t === 'fornadas') return `${f === 1 ? 'Falta' : 'Faltam'} ${plr(f, 'receita marcada', 'receitas marcadas')}.`
  if (r.t === 'dias') return `${f === 1 ? 'Falta' : 'Faltam'} ${plr(f, 'dia', 'dias')} para a sua sequência chegar a ${r.n} dias.`
  if (r.t === 'selos') return `${f === 1 ? 'Falta' : 'Faltam'} ${plr(f, 'selo', 'selos')} na sua estante.`
  return `${f === 1 ? 'Falta' : 'Faltam'} ${plr(f, 'conta feita', 'contas feitas')} na Conta da Fornada.`
}
/** como se libera, a regra completa (para a lista de extras) */
export function reqRule(e: Extra): string {
  const r = e.req
  if (r.t === 'level') return `Libera quando você chegar a ${LEVELS[r.n].name}.`
  if (r.t === 'fornadas') return `Libera com ${plr(r.n, 'receita marcada', 'receitas marcadas')} no Livro de Fornadas.`
  if (r.t === 'dias') return `Libera quando a sua sequência chegar a ${r.n} dias (o dia de descanso vale).`
  if (r.t === 'selos') return `Libera com ${plr(r.n, 'selo conquistado', 'selos conquistados')}.`
  return `Libera depois de ${plr(r.n, 'conta feita', 'contas feitas')} na Conta da Fornada.`
}
export const extraReason = (e: Extra): string => `Extra do app, liberado por progresso. ${reqRule(e).replace(/^Libera/, 'Liberou')}`
/** liberado: já gravado, ou o progresso de agora atingiu a regra. No modo sem pressão tudo fica aberto (não há placar). */
export const extraUnlocked = (e: Extra, st: GameState, semPressao = false): boolean => semPressao || st.semPressao || !!st.desbloqueados?.includes(e.id) || reqMet(e, progressOf(st))
export const extrasUnlockedIds = (st: GameState): string[] => EXTRAS.filter((e) => extraUnlocked(e, st)).map((e) => e.id)

/** o próximo extra a liberar: o que já está mais perto de abrir. Nada que a cliente comprou depende disto. */
export interface NextUnlock {
  extra: Extra
  missing: string
  pct: number
}
export function nextUnlock(st: GameState): NextUnlock | null {
  const p = progressOf(st)
  const locked = EXTRAS.filter((e) => !st.desbloqueados?.includes(e.id) && !reqMet(e, p))
  if (locked.length === 0) return null
  const best = [...locked].sort((a, b) => reqPct(b, p) - reqPct(a, p))[0]
  return { extra: best, missing: reqMissing(best, p), pct: reqPct(best, p) }
}

/** grava o que acabou de liberar (nunca volta a trancar) e avisa só do que é novo */
export function withUnlocks(before: GameState, res: Res): Res {
  const was = new Set(extrasUnlockedIds({ ...before, semPressao: false }))
  const st = res.st
  const now = EXTRAS.filter((e) => !st.desbloqueados?.includes(e.id) && (reqMet(e, progressOf(st)) || was.has(e.id))).map((e) => e.id)
  if (now.length === 0) return res
  const msgs = [...res.msgs]
  for (const id of now) if (!was.has(id)) msgs.push(`Extra liberado: ${EXTRAS.find((e) => e.id === id)!.title}.`)
  return { st: { ...st, desbloqueados: [...(st.desbloqueados ?? []), ...now] }, msgs }
}

// ------------------------------------------------------------ próximo passo (a bolinha vermelha: no máximo UM, nunca por venda)
export interface NextStep {
  key: string
  text: string
  to: string
}
export function nextStepOf(st: GameState, c: { today: string; titleOf: (item: string) => string; seenNotDone: string[] }): NextStep | null {
  const recent = [...st.fornadas].reverse().find((f) => !f.texto && !f.nota && !f.foto && diffDays(f.d, c.today) >= 1 && diffDays(f.d, c.today) <= 3)
  if (recent) return { key: `nota:${recent.id}`, text: `Anote como ficou: ${c.titleOf(recent.item)}`, to: '/fornada/livro' }
  if (!st.semPressao) {
    const ex = EXTRAS.find((e) => extraUnlocked(e, st) && !st.extrasVistos.includes(e.id))
    if (ex) return { key: `extra:${ex.id}`, text: `Extra liberado: ${ex.title}`, to: `/fornada/extras/${ex.id}` }
  }
  const cont = c.seenNotDone[0]
  if (cont) return { key: `seguir:${cont}`, text: `Seu próximo passo: terminar ${c.titleOf(cont)}`, to: `/produto/${cont}` }
  return null
}
export const dotCount = (st: GameState, step: NextStep | null): number => (!st.semPressao && st.config.gamificacao && step && st.ack !== step.key ? 1 : 0)

// ------------------------------------------------------------ Meu mês na cozinha (só números reais, calculados no aparelho)
export interface MonthView {
  receitas: number
  fornadas: number
  anotadas: number
  selos: number
  pf: number
  texto: string
}
export function monthView(st: GameState, ym: string): MonthView {
  const f = st.fornadas.filter((x) => x.d.startsWith(ym))
  const receitas = new Set(f.map((x) => x.item)).size
  const selos = Object.entries(st.seals).filter(([id, d]) => d.startsWith(ym) && id !== 'nivel:0').length
  const pf = st.pfLog.filter((e) => e.d.startsWith(ym)).reduce((t, e) => t + e.pf, 0)
  const anotadas = f.filter((x) => x.nota || x.texto || x.foto).length
  const nome = MONTHS[Number(ym.slice(5, 7)) - 1]
  const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`
  const texto = f.length === 0 && selos === 0 ? `Em ${nome} ainda não há receitas marcadas. Sem pressa.` : `Em ${nome} você fez ${plural(receitas, 'receita', 'receitas')} e ganhou ${plural(selos, 'selo', 'selos')}.`
  return { receitas, fornadas: f.length, anotadas, selos, pf, texto }
}

// ------------------------------------------------------------ 30 frases de incentivo honestas (sempre sobre algo que a cliente fez)
export interface Stats {
  semana: number
  hoje: number
  total: number
  dias: number
  fotos: number
  notas: number
  selos: number
  socorros: number
  encomendas: number
  entregues: number
  nivel: number
  variedade: number
  favs: number
  desafiosSemana: number
  casa: number
  presentes: number
  mes: number
}
export function statsOf(st: GameState, today: string): Stats {
  const w = weekKey(today)
  const f = st.fornadas
  return {
    semana: f.filter((x) => weekKey(x.d) === w).length,
    hoje: f.filter((x) => x.d === today).length,
    total: f.length,
    dias: st.streak.dias,
    fotos: f.filter((x) => x.foto).length,
    notas: f.filter((x) => x.texto).length,
    selos: Object.keys(st.seals).length,
    socorros: Object.keys(st.seals).filter((k) => k.startsWith('socorro:')).length,
    encomendas: st.encomendas.length,
    entregues: entreguesOf(st),
    nivel: st.level,
    variedade: categoriesDone(st),
    favs: st.fav.length,
    desafiosSemana: st.challenges.semana === w ? st.challenges.feitos.length : 0,
    casa: Object.keys(st.seals).filter((k) => k.startsWith('casa:')).length,
    presentes: f.filter((x) => x.presente).length,
    mes: f.filter((x) => x.d.startsWith(today.slice(0, 7))).length,
  }
}
const pl = (n: number, a: string, b: string): string => `${n} ${n === 1 ? a : b}`
export interface Phrase {
  id: string
  when: (s: Stats) => boolean
  text: (s: Stats) => string
}
export const PHRASES: Phrase[] = [
  { id: 'p01', when: (s) => s.semana >= 1, text: (s) => `Você fez ${pl(s.semana, 'receita', 'receitas')} esta semana. Isso é constância.` },
  { id: 'p02', when: (s) => s.semana >= 3, text: () => 'Três ou mais fornadas na semana. Sua cozinha está em ritmo.' },
  { id: 'p03', when: (s) => s.hoje >= 1, text: () => 'Hoje você já cozinhou. Pode descansar com a consciência tranquila.' },
  { id: 'p04', when: (s) => s.total === 1, text: () => 'A primeira fornada anotada. Todo caderno começa na primeira página.' },
  { id: 'p05', when: (s) => s.total >= 5, text: (s) => `${pl(s.total, 'fornada anotada', 'fornadas anotadas')} no seu livro. Dá para ver a sua evolução.` },
  { id: 'p06', when: (s) => s.total >= 10, text: () => 'Dez fornadas ou mais. A mão já conhece a massa.' },
  { id: 'p07', when: (s) => s.dias >= 2, text: (s) => `${s.dias} dias seguidos na cozinha. Dia de descanso também vale.` },
  { id: 'p08', when: (s) => s.dias >= 7, text: () => 'Uma semana inteira de cozinha. Que ritmo bonito.' },
  { id: 'p09', when: (s) => s.fotos >= 1, text: (s) => `Você registrou ${pl(s.fotos, 'foto', 'fotos')}. Olhar para trás ajuda a acertar na frente.` },
  { id: 'p10', when: (s) => s.notas >= 1, text: () => 'Anotar o que mudou é o que faz a receita ficar sua.' },
  { id: 'p11', when: (s) => s.notas >= 5, text: (s) => `${pl(s.notas, 'anotação', 'anotações')} no livro. Você presta atenção no que faz.` },
  { id: 'p12', when: (s) => s.selos >= 3, text: (s) => `Você já tem ${s.selos} selos. Cada um é uma coisa que você fez.` },
  { id: 'p13', when: (s) => s.socorros >= 1, text: () => 'Fornada salva! Saber recuperar uma massa também é técnica.' },
  { id: 'p14', when: (s) => s.encomendas >= 1, text: (s) => `${pl(s.encomendas, 'encomenda registrada', 'encomendas registradas')} no seu caderno. Organização é cuidado.` },
  { id: 'p15', when: (s) => s.entregues >= 1, text: (s) => `${pl(s.entregues, 'encomenda entregue', 'encomendas entregues')}. Cada entrega conta.` },
  { id: 'p16', when: (s) => s.nivel >= 1, text: () => 'Você subiu de nível fazendo, não esperando. Parabéns.' },
  { id: 'p17', when: (s) => s.variedade >= 3, text: (s) => `Já provou ${s.variedade} tipos de receita. Que variedade.` },
  { id: 'p18', when: (s) => s.favs >= 1, text: (s) => `${pl(s.favs, 'receita favorita', 'receitas favoritas')}. Você sabe do que gosta.` },
  { id: 'p19', when: (s) => s.desafiosSemana >= 1, text: (s) => `${pl(s.desafiosSemana, 'desafio feito', 'desafios feitos')} esta semana. Pequenos passos somam.` },
  { id: 'p20', when: (s) => s.casa >= 1, text: () => 'Uma receita de casa: você já a faz sem olhar tanto a ficha.' },
  { id: 'p21', when: (s) => s.presentes >= 1, text: () => 'Fornada de presente. Que gesto bonito.' },
  { id: 'p22', when: (s) => s.mes >= 2, text: (s) => `${pl(s.mes, 'receita', 'receitas')} neste mês. Seu ritmo é só seu.` },
  { id: 'p23', when: (s) => s.total >= 1 && s.semana === 0, text: () => 'Sua última fornada está no livro. Quando quiser voltar, ela te espera.' },
  { id: 'p24', when: (s) => s.total >= 2, text: () => 'Refazer a mesma receita é como se treina a mão.' },
  { id: 'p25', when: (s) => s.fotos >= 3, text: () => 'Três fotos ou mais: dá para comparar as fornadas lado a lado.' },
  { id: 'p26', when: (s) => s.entregues >= 3, text: () => 'Três entregas ou mais. Você cumpre o que combina.' },
  { id: 'p27', when: (s) => s.selos >= 8, text: () => 'Oito selos ou mais. A sua estante de conquistas está crescendo.' },
  { id: 'p28', when: (s) => s.nivel >= 2, text: () => 'Confeiteira de verdade: o que você fez para chegar aqui é seu.' },
  { id: 'p29', when: (s) => s.total >= 1, text: () => 'Você marcou o que fez, e só o que fez. Esse é o jeito honesto de acompanhar.' },
  { id: 'p30', when: () => true, text: () => 'Você abriu o app hoje. Escolha um passo pequeno, sem pressa.' },
]
export function incentiveOf(s: Stats, today: string): string {
  const ok = PHRASES.filter((p) => p.when(s))
  return ok[dayNum(today) % ok.length].text(s)
}

// ------------------------------------------------------------ boas-vindas de volta (sem culpa)
export const AWAY_DAYS = 5
export const awayDays = (st: GameState, today: string): number => (st.ultimaVisita ? diffDays(st.ultimaVisita, today) : 0)

// ------------------------------------------------------------ pequenas edições (sem pontos)
export function removeFornada(inp: GameState, id: string): GameState {
  const st = clone(inp)
  st.fornadas = st.fornadas.filter((f) => f.id !== id) // os pontos já ganhos ficam no extrato: o nível nunca desce
  return st
}
export function removeEncomenda(inp: GameState, id: string): GameState {
  const st = clone(inp)
  st.encomendas = st.encomendas.filter((e) => e.id !== id)
  return st
}
export function setMetaEncomendas(inp: GameState, n: number | null): GameState {
  const st = clone(inp)
  st.metaEncomendas = n && n > 0 ? Math.min(999, Math.round(n)) : null
  return st
}
export function closeLevelCard(inp: GameState): GameState {
  return { ...inp, levelCard: null }
}
export function seeExtra(inp: GameState, id: string): GameState {
  return inp.extrasVistos.includes(id) ? inp : { ...inp, extrasVistos: [...inp.extrasVistos, id] }
}
export function ackStep(inp: GameState, key: string | null): GameState {
  return inp.ack === key ? inp : { ...inp, ack: key }
}
export function visit(inp: GameState, today: string, item?: string): GameState {
  if (inp.ultimaVisita === today && (!item || inp.ultimoItem === item)) return inp
  return { ...inp, ultimaVisita: today, ultimoItem: item ?? inp.ultimoItem }
}

// ------------------------------------------------------------ comemoração (só um cartão e, se a cliente deixar, um confete leve; sem som)
export interface Celebration {
  kind: 'nivel' | 'selo' | 'extra' | 'receita' | 'missoes'
  title: string
  text: string
  icon: SealIcon
}
/** lê as mensagens de uma ação e escolhe UMA comemoração, a mais importante: nível > selo > extra > missões > receita */
export function celebrationOf(msgs: string[]): Celebration | null {
  const lvl = msgs.find((m) => m.startsWith('Você agora é '))
  if (lvl) {
    const idx = LEVELS.findIndex((l) => lvl.startsWith(`Você agora é ${l.name}!`))
    return { kind: 'nivel', title: 'Novo nível!', text: lvl, icon: LEVELS[Math.max(0, idx)].id }
  }
  const sel = msgs.find((m) => m.startsWith('Selo surpresa conquistado: ')) ?? msgs.find((m) => /^Selo conquistado: /.test(m))
  if (sel) {
    const name = sel.replace(/^Selo (surpresa )?conquistado: /, '').replace(/\.$/, '')
    return { kind: 'selo', title: /surpresa/.test(sel) ? 'Selo surpresa!' : 'Selo novo!', text: name, icon: [...STATIC_SEALS, ...HIDDEN_SEALS].find((x) => x.name === name)?.icon ?? 'receita' }
  }
  const ext = msgs.find((m) => m.startsWith('Extra liberado: '))
  if (ext) return { kind: 'extra', title: 'Extra liberado', text: ext.replace('Extra liberado: ', 'Extra do app, liberado por progresso: '), icon: 'presente' }
  if (msgs.some((m) => m.startsWith('Missões de hoje completas'))) return { kind: 'missoes', title: 'Missões de hoje feitas', text: 'Você completou as 3 missões. Descanse ou siga no seu ritmo.', icon: 'desafio' }
  const rec = msgs.find((m) => /^\+\d+ PF: Fiz /.test(m))
  if (rec) return { kind: 'receita', title: 'Receita feita!', text: rec.replace(/^\+\d+ PF: /, ''), icon: 'receita' }
  return null
}

// ------------------------------------------------------------ PF da semana (para o ranking anônimo)
export const weeklyPf = (st: GameState, today: string): number => {
  const w = weekKey(today)
  return st.pfLog.filter((e) => weekKey(e.d) === w).reduce((t, e) => t + e.pf, 0)
}

// ------------------------------------------------------------ metas ligadas à Conta da Fornada e ao Diário de vendas
export interface ContaMeta {
  id: 'conta1' | 'conta5' | 'venda1'
  txt: string
  feita: boolean
  now: number
  de: number
}
export function contaMetas(st: GameState): ContaMeta[] {
  const n = Object.keys(st.contas ?? {}).length
  return [
    { id: 'conta1', txt: 'Primeira conta feita', feita: !!st.seals.conta, now: st.seals.conta ? 1 : 0, de: 1 },
    { id: 'conta5', txt: 'Conta de 5 receitas diferentes', feita: !!st.seals.conta5, now: Math.min(5, n), de: 5 },
    { id: 'venda1', txt: 'Primeira venda anotada no diário', feita: !!st.seals.venda1, now: st.seals.venda1 ? 1 : 0, de: 1 },
  ]
}
/** primeira venda anotada no Diário de vendas: selo s12 e +10 PF, uma vez (só a ação de anotar, nunca o valor) */
export function onVendaAnotada(inp: GameState, c: BaseCtx): Res {
  const st = clone(inp)
  const msgs: string[] = []
  ensureWeek(st, c.today, !!c.hasBump, !!c.contaOk)
  ensureDay(st, c)
  if (hasOnce(st, 'venda1')) return { st: inp, msgs }
  award(st, msgs, c.today, 'venda1', PF.venda1, 'Primeira venda anotada')
  seal(st, msgs, 'venda1', c.today, 'Primeira venda anotada')
  return { st, msgs }
}

// ------------------------------------------------------------ o que aparece com o jogo ligado, desligado ou no modo sem pressão
export const showGame = (st: GameState): boolean => st.config.gamificacao && !st.semPressao
/** ranking e diário de vendas: fora do modo sem pressão e fora do jogo desligado */
export const showRank = (st: GameState): boolean => showGame(st)
export const showDiary = (st: GameState): boolean => showGame(st)
