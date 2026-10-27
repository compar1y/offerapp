// Conta da Fornada: fórmulas puras (sem navegador, sem Node). Usadas pelo app (src/calc) e pelos testes (server/test).
// Dinheiro em CENTAVOS INTEIROS. Cada linha de ingrediente arredonda meio para cima ao centavo, como o calc.py do Bônus 07,
// e o teste de diferença zero (server/test/smoke.ts) compara as 100 receitas, em centavos, com receitas-100-custos.csv.
// Tudo aqui é conta com os números que a cliente digita. Não é previsão de venda nem de ganho.
import {
  ALIAS,
  CONVERSOES,
  EMBALAGEM_UN_EXEMPLO,
  GRATIS,
  INGREDIENTES_BASE,
  RECEITAS,
  type Custeio,
  type LinhaTxt,
  type Medida,
  type ReceitaCusto,
  type UnidadeBase,
} from './receitas-custo.js'

export type { Medida, UnidadeBase, ReceitaCusto, Custeio, LinhaTxt }
export { RECEITAS, INGREDIENTES_BASE }

export const FORMULA_VERSION = 1

// ---------- premissas do Bônus 07 (exemplos, a cliente troca) ----------
export const PREMISSAS = {
  perdaPct: { G: 5, M: 10 } as Record<'G' | 'M', number>,
  // gás/energia por fornada (centavos), quantas unidades cabem por fornada e se a conta é fracionada
  gas: {
    G: { porFornadaCents: 210, cabem: 2, fracionada: true },
    M: { porFornadaCents: 36, cabem: 4, fracionada: false },
  } as Record<'G' | 'M', { porFornadaCents: number; cabem: number; fracionada: boolean }>,
  embUnCents: EMBALAGEM_UN_EXEMPLO as Record<'G' | 'M', number>,
  faixas: [
    { id: 'minimo', nome: 'Mínimo', mult: 1.5 },
    { id: 'ideal', nome: 'Ideal', mult: 2 },
    { id: 'premium', nome: 'Premium', mult: 3 },
  ] as const,
  despesasFixasExemploCents: 30000,
  horaExemploCents: 1200,
  semanasMes: 4,
}

export const LIMITES = {
  maxCents: 10_000_000, // R$ 100.000 por campo
  maxQtd: 1_000_000,
  maxPerdaPct: 90,
  maxTaxaPct: 50,
  maxLinhas: 120,
  maxContas: 300,
}

// ---------- números ----------
const EPS = 1e-9
/** meio para cima ao inteiro (centavos) */
export function round(x: number): number {
  if (!Number.isFinite(x)) return 0
  return x < 0 ? -Math.floor(-x + 0.5 + EPS) : Math.floor(x + 0.5 + EPS)
}
/** teto com tolerância de ponto flutuante */
export function ceil(x: number): number {
  return Math.ceil(x - EPS)
}
/** teto ao real inteiro, em centavos */
export function ceilReal(cents: number): number {
  return ceil(cents / 100) * 100
}

/** "1/2", "1 1/2", "2,5", "2.5" -> número; NaN se inválido */
export function parseQtd(v: string | number): number {
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(',', '.')
  if (!s) return NaN
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fr = s.match(/^(\d+)\/(\d+)$/)
  if (fr) return Number(fr[2]) === 0 ? NaN : Number(fr[1]) / Number(fr[2])
  return /^\d*\.?\d+$/.test(s) ? Number(s) : NaN
}

/** texto digitado (com vírgula ou ponto, "R$", milhar) -> centavos; null se inválido ou fora do limite */
export function parseMoney(v: string): number | null {
  let s = String(v).replace(/R\$/gi, '').replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  if (!/^\d*\.?\d+$/.test(s)) return null
  const c = round(Number(s) * 100)
  return c >= 0 && c <= LIMITES.maxCents ? c : null
}
export function parseNumero(v: string, max = LIMITES.maxQtd): number | null {
  const n = parseQtd(v)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null
}

export function brl(cents: number): string {
  const neg = cents < 0
  const a = Math.abs(Math.round(cents))
  const reais = Math.floor(a / 100)
  const c = String(a % 100).padStart(2, '0')
  return `${neg ? '-' : ''}R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`
}
/** tabela de reais inteiros: R$ 36 */
export function brlInt(cents: number): string {
  return cents % 100 === 0 ? brl(cents).replace(/,00$/, '') : brl(cents)
}
export function pctTxt(frac: number, casas = 0): string {
  const x = frac * 100
  const v = casas === 0 ? round(x) : Math.round(x * 10 ** casas) / 10 ** casas
  return `${String(v).replace('.', ',')}%`
}

// ---------- ingredientes e preços ----------
export interface PrecoIng {
  precoCents: number
  qtdPacote: number
  unidade: UnidadeBase
  /** exemplo = veio do Bônus 07 e ainda não foi trocado; meu = a cliente digitou */
  fonte: 'exemplo' | 'meu'
  /** só ingrediente próprio (não está nas 100 receitas) */
  nome?: string
  embalagem?: string
  em?: string
  /** preços anteriores digitados por ela (para o alerta de alta) */
  hist?: { em: string; precoCents: number; qtdPacote: number }[]
}
export type Precos = Record<string, PrecoIng>

export const norm = (id: string): string => ALIAS[id] ?? id
const BASE = new Map(INGREDIENTES_BASE.map((i) => [i.id, i]))
export const ehProprio = (id: string): boolean => id.startsWith('x_')

export function nomeIng(id: string, precos?: Precos): string {
  const k = norm(id)
  if (GRATIS.includes(k)) return 'Água'
  return precos?.[k]?.nome ?? BASE.get(k)?.nome ?? k
}
export function medidaPadrao(id: string, precos?: Precos): Medida {
  const u = precos?.[norm(id)]?.unidade ?? BASE.get(norm(id))?.unidade
  return u ?? 'g'
}

export function precosExemplo(): Precos {
  const out: Precos = {}
  for (const i of INGREDIENTES_BASE) {
    out[i.id] = { precoCents: i.precoCents, qtdPacote: i.qtdPacote, unidade: i.unidade, fonte: 'exemplo', embalagem: i.embalagem }
  }
  return out
}

/** quantidade na unidade base do preço (g, ml ou un); null se não há conversão segura (nunca converte volume em peso por conta própria) */
export function qtdBase(ing: string, qtd: number, med: Medida, unidadePreco: UnidadeBase): number | null {
  const k = norm(ing)
  if (med === 'g') return unidadePreco === 'g' ? qtd : null
  if (med === 'ml') return unidadePreco === 'ml' ? qtd : null
  if (med === 'xic') {
    const f = CONVERSOES.xic[k]
    return f === undefined ? null : qtd * f
  }
  if (med === 'cs') return unidadePreco === 'ml' ? qtd * CONVERSOES.csMl : null
  if (med === 'cc') {
    const g = CONVERSOES.ccG[k]
    if (g !== undefined) return unidadePreco === 'g' ? qtd * g : null
    return unidadePreco === 'ml' ? qtd * CONVERSOES.ccMl : null
  }
  if (med === 'un') {
    if (unidadePreco !== 'un') return null
    return qtd * (CONVERSOES.un[k] ?? 1)
  }
  return null
}

export function custoLinhaIng(ing: string, qtd: number, med: Medida, precos: Precos): number | null {
  const k = norm(ing)
  if (GRATIS.includes(k)) return 0
  const p = precos[k]
  if (!p || !(p.qtdPacote > 0) || !(p.precoCents >= 0)) return null
  const bq = qtdBase(k, qtd, med, p.unidade)
  if (bq === null) return null
  return round((p.precoCents * bq) / p.qtdPacote)
}

// ---------- linhas e contas ----------
export interface LinhaIng {
  id: string
  k: 'i'
  ing: string
  /** número ou fração em texto ("1/2") */
  qtd: number | string
  med: Medida
  /** linha que TIRA do custo (variação) */
  neg?: boolean
}
/** parte da receita-base, em unidades (custo = custo da base por unidade x unidades; igual ao calc.py) */
export interface LinhaBase {
  id: string
  k: 'b'
  receita: number
  un: number
}
export type Linha = LinhaIng | LinhaBase

export interface Conta {
  id: string
  nome: string
  /** número da receita do Bônus 07, ou null quando é uma receita da própria cliente */
  receita: number | null
  criadaEm: string
  atualizadaEm: string
  /** 'rascunho' enquanto ela monta; 'concluida' quando guardou */
  estado: 'rascunho' | 'concluida'
  /** versão da fórmula usada (para migrar contas antigas) */
  fv: number
  tipo: 'G' | 'M'
  /** unidades que a receita rende no livro */
  rende: number
  fator: number
  linhas: Linha[]
  perdaPct: number
  gas: { porFornadaCents: number; cabem: number; fracionada: boolean; exemplo: boolean }
  embUnCents: number
  embExemplo: boolean
  horas: number
  valorHoraCents: number
  outrosCents: number
  /** o preço que ela cobra por unidade (centavos); null = ainda não digitou */
  precoCents: number | null
  taxaPct: number
  taxaFixaCents: number
  freteCents: number
  unPorPedido: number
  margemAlvoPct: number
  arred: 'real' | 'noventa' | 'nenhum'
  nota?: string
}

let seq = 0
export function novoId(prefixo = 'c'): string {
  seq += 1
  const r = Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0')
  return `${prefixo}${Date.now().toString(36)}${seq.toString(36)}${r}`
}

export function receitaDe(n: number): ReceitaCusto | undefined {
  return RECEITAS.find((r) => r.n === n)
}

function linhasTxt(prefixo: string, arr: LinhaTxt[], neg?: boolean): LinhaIng[] {
  return arr.map(([ing, qtd, med], i) => ({ id: `${prefixo}${i}`, k: 'i', ing, qtd, med, ...(neg ? { neg: true } : {}) }))
}

/** linhas da receita do livro, no formato da conta */
export function linhasDaReceita(n: number): Linha[] {
  const r = receitaDe(n)
  if (!r) return []
  const c = r.custeio
  if (c.kind === 'completa') return linhasTxt('i', c.itens)
  if (c.kind === 'variacao') {
    const b = receitaDe(c.base)
    return [{ id: 'b0', k: 'b', receita: c.base, un: b ? b.unidades : r.unidades }, ...linhasTxt('t', c.remove, true), ...linhasTxt('p', c.add)]
  }
  return [{ id: 'b0', k: 'b', receita: c.base, un: c.baseUn }, ...linhasTxt('p', c.add)]
}

export function contaDaReceita(n: number, agora: string, id = novoId()): Conta | null {
  const r = receitaDe(n)
  if (!r) return null
  const g = PREMISSAS.gas[r.tipo]
  return {
    id,
    nome: r.nome,
    receita: n,
    criadaEm: agora,
    atualizadaEm: agora,
    estado: 'rascunho',
    fv: FORMULA_VERSION,
    tipo: r.tipo,
    rende: r.unidades,
    fator: 1,
    linhas: linhasDaReceita(n),
    perdaPct: PREMISSAS.perdaPct[r.tipo],
    gas: { ...g, exemplo: true },
    embUnCents: PREMISSAS.embUnCents[r.tipo],
    embExemplo: true,
    horas: 0,
    valorHoraCents: 0,
    outrosCents: 0,
    precoCents: null,
    taxaPct: 0,
    taxaFixaCents: 0,
    freteCents: 0,
    unPorPedido: 1,
    margemAlvoPct: 40,
    arred: 'real',
  }
}

export function contaVazia(nome: string, agora: string, id = novoId()): Conta {
  return {
    id,
    nome,
    receita: null,
    criadaEm: agora,
    atualizadaEm: agora,
    estado: 'rascunho',
    fv: FORMULA_VERSION,
    tipo: 'G',
    rende: 1,
    fator: 1,
    linhas: [],
    perdaPct: 5,
    gas: { porFornadaCents: 0, cabem: 1, fracionada: false, exemplo: false },
    embUnCents: 0,
    embExemplo: false,
    horas: 0,
    valorHoraCents: 0,
    outrosCents: 0,
    precoCents: null,
    taxaPct: 0,
    taxaFixaCents: 0,
    freteCents: 0,
    unPorPedido: 1,
    margemAlvoPct: 40,
    arred: 'real',
  }
}

// ---------- custo da receita ----------
export interface LinhaCalc {
  linha: Linha
  /** centavos, já arredondado; negativo quando a linha tira; null = sem preço ou medida sem conversão */
  cents: number | null
  motivo?: 'sem-preco' | 'sem-conversao' | 'qtd-invalida'
}

/** custo (centavos) da parte da base para `un` unidades, como no calc.py */
function custoBase(n: number, un: number, precos: Precos, memo: Map<number, { total: number; ok: boolean }>): { cents: number; ok: boolean } {
  const b = receitaDe(n)
  if (!b) return { cents: 0, ok: false }
  const t = totalReceitaLivro(n, precos, memo)
  const cents = un === b.unidades ? t.total : round(t.total / b.unidades) * un
  return { cents, ok: t.ok }
}

function totalReceitaLivro(n: number, precos: Precos, memo: Map<number, { total: number; ok: boolean }>): { total: number; ok: boolean } {
  const hit = memo.get(n)
  if (hit) return hit
  const out = { total: 0, ok: true }
  for (const l of linhasDaReceita(n)) {
    if (l.k === 'b') {
      const c = custoBase(l.receita, l.un, precos, memo)
      out.total += c.cents
      if (!c.ok) out.ok = false
    } else {
      const q = parseQtd(l.qtd)
      const c = Number.isFinite(q) ? custoLinhaIng(l.ing, q, l.med, precos) : null
      if (c === null) out.ok = false
      else out.total += l.neg ? -c : c
    }
  }
  memo.set(n, out)
  return out
}

export function custoLinhas(linhas: Linha[], precos: Precos): LinhaCalc[] {
  const memo = new Map<number, { total: number; ok: boolean }>()
  return linhas.map((linha) => {
    if (linha.k === 'b') {
      const c = custoBase(linha.receita, linha.un, precos, memo)
      return { linha, cents: c.ok ? c.cents : null, ...(c.ok ? {} : { motivo: 'sem-preco' as const }) }
    }
    const q = parseQtd(linha.qtd)
    if (!Number.isFinite(q) || q < 0 || q > LIMITES.maxQtd) return { linha, cents: null, motivo: 'qtd-invalida' as const }
    const k = norm(linha.ing)
    if (!GRATIS.includes(k)) {
      const p = precos[k]
      if (!p || !(p.qtdPacote > 0)) return { linha, cents: null, motivo: 'sem-preco' as const }
    }
    const c = custoLinhaIng(linha.ing, q, linha.med, precos)
    if (c === null) return { linha, cents: null, motivo: 'sem-conversao' as const }
    return { linha, cents: linha.neg ? -c : c }
  })
}

/** ingredientes (já sem alias) que faltam preço ou conversão */
export function faltando(linhas: LinhaCalc[], precos: Precos): string[] {
  const out = new Set<string>()
  for (const l of linhas) {
    if (l.cents !== null) continue
    if (l.linha.k === 'i') out.add(norm(l.linha.ing))
    else {
      // base sem preço: lista os ingredientes da base que faltam
      for (const sub of custoLinhas(linhasDaReceita(l.linha.receita), precos)) {
        if (sub.cents === null && sub.linha.k === 'i') out.add(norm(sub.linha.ing))
      }
    }
  }
  return [...out]
}

// ---------- resultado da conta ----------
export interface Resultado {
  ok: boolean
  /** por que não deu para calcular */
  erro?: 'rende' | 'perda' | 'incompleta'
  incompletos: string[]
  R: number
  L: number
  I: number
  G: number
  E: number
  M: number
  A: number
  K: number
  /** K sem a hora dela */
  K0: number
  /** custo por unidade; null quando incompleta */
  c: number | null
  c0: number | null
  s: number
  linhas: LinhaCalc[]
  /** peso de cada ingrediente no custo dos ingredientes, maiores primeiro */
  pesos: { ing: string; cents: number; share: number }[]
}

export function calcular(conta: Conta, precos: Precos): Resultado {
  const linhas = custoLinhas(conta.linhas, precos)
  const incompletos = faltando(linhas, precos)
  const R = conta.rende * conta.fator
  const p = conta.perdaPct / 100
  const L = R * (1 - p)
  const base: Resultado = { ok: false, incompletos, R, L, I: 0, G: 0, E: 0, M: 0, A: 0, K: 0, K0: 0, c: null, c0: null, s: 0, linhas, pesos: [] }
  if (!(conta.rende > 0) || !(conta.fator > 0) || !(L > 0)) return { ...base, erro: 'rende' }
  if (!(conta.perdaPct >= 0) || conta.perdaPct > LIMITES.maxPerdaPct) return { ...base, erro: 'perda' }

  const soma = linhas.reduce((s, l) => s + (l.cents ?? 0), 0)
  const I = conta.fator === 1 ? soma : round(soma * conta.fator)
  const g = conta.gas
  const G = g.fracionada ? round((g.porFornadaCents * R) / g.cabem) : g.porFornadaCents * ceil(R / g.cabem)
  const E = round(conta.embUnCents * L)
  const M = round(conta.horas * conta.valorHoraCents)
  const A = conta.outrosCents
  const K = I + G + E + M + A
  const K0 = K - M
  const c = incompletos.length ? null : round(K / L)
  const c0 = incompletos.length ? null : round(K0 / L)
  const s = conta.unPorPedido > 0 ? round((conta.taxaFixaCents + conta.freteCents) / conta.unPorPedido) : 0

  // peso por ingrediente (só linhas de ingrediente; a base entra pelo custo dos ingredientes dela)
  const por = new Map<string, number>()
  for (const l of linhas) {
    if (l.cents === null) continue
    if (l.linha.k === 'i') por.set(norm(l.linha.ing), (por.get(norm(l.linha.ing)) ?? 0) + l.cents)
    else {
      const b = receitaDe(l.linha.receita)
      if (!b) continue
      const fator = l.linha.un / b.unidades
      for (const sub of custoLinhas(linhasDaReceita(l.linha.receita), precos)) {
        if (sub.cents === null || sub.linha.k !== 'i') continue
        const k = norm(sub.linha.ing)
        por.set(k, (por.get(k) ?? 0) + round(sub.cents * fator))
      }
    }
  }
  const tot = [...por.values()].reduce((a, b) => a + b, 0)
  const pesos = [...por.entries()]
    .filter(([, v]) => v > 0)
    .map(([ing, cents]) => ({ ing, cents, share: tot > 0 ? cents / tot : 0 }))
    .sort((a, b) => b.cents - a.cents)

  return { ...base, ok: incompletos.length === 0, erro: incompletos.length ? 'incompleta' : undefined, I, G, E, M, A, K, K0, c, c0, s, pesos }
}

// ---------- preço, sobra, margem ----------
export interface PrecoRes {
  /** sobra por unidade (centavos); pode ser negativa */
  pi: number
  /** margem (fração) ou null quando P = 0 */
  m: number | null
  /** markup (P/c) ou null */
  k: number | null
  /** sobra do lote (centavos), se tudo o que sair bom for vendido ao preço */
  lote: number
}

export function precoRes(P: number, c: number, K: number, L: number, taxaPct: number, s: number): PrecoRes {
  const t = taxaPct / 100
  const pi = round(P * (1 - t)) - c - s
  const lote = round(P * (1 - t) * L - K - s * L)
  return { pi, m: P > 0 ? pi / P : null, k: c > 0 && P > 0 ? P / c : null, lote }
}

/** preço de empate P0 = (c + s) / (1 - t), arredondado PARA CIMA ao centavo (abaixo disso, prejuízo) */
export function precoEmpate(c: number, s: number, taxaPct: number): number | null {
  const t = taxaPct / 100
  if (t >= 1) return null
  return ceil((c + s) / (1 - t))
}

/** preço sugerido pela margem-alvo, arredondado PARA CIMA (ao real, para ,90 ou ao centavo); null se taxa + margem >= 100% */
export function precoSugerido(c: number, s: number, taxaPct: number, margemPct: number, arred: 'real' | 'noventa' | 'nenhum'): number | null {
  const d = 1 - taxaPct / 100 - margemPct / 100
  if (!(d > EPS)) return null
  const x = (c + s) / d
  if (arred === 'real') return ceilReal(x)
  if (arred === 'noventa') return ceil((x - 90) / 100) * 100 + 90
  return ceil(x)
}

/** faixas do Bônus 07: teto ao real de 1,5, 2 e 3 vezes o custo por unidade */
export function faixas(c: number): { id: string; nome: string; mult: number; precoCents: number }[] {
  return PREMISSAS.faixas.map((f) => ({ id: f.id, nome: f.nome, mult: f.mult, precoCents: ceilReal(c * f.mult) }))
}

/** custo máximo por unidade para o preço que o cliente aceita e a margem desejada (F16) */
export function custoAlvo(P: number, s: number, taxaPct: number, margemPct: number): number {
  return Math.floor(P * (1 - taxaPct / 100 - margemPct / 100) - s + EPS)
}

// ---------- mês ----------
export function equilibrio(Fm: number, pi: number): number | null {
  if (!(pi > 0) || !(Fm >= 0)) return null
  return ceil(Fm / pi)
}
/** pesos w_i (proporção definida por ela); normaliza para somar 1 */
export function piMedio(itens: { pi: number; peso: number }[]): number | null {
  const tot = itens.reduce((s, i) => s + Math.max(0, i.peso), 0)
  if (!(tot > 0)) return null
  return itens.reduce((s, i) => s + (i.pi * Math.max(0, i.peso)) / tot, 0)
}
export interface MetaRes {
  unidades: number
  lotes: number
  horas: number
  porSemana: number
}
/** F14: unidades = teto((X + Fm) / pi); lotes = teto(unidades / L); horas = lotes x H */
export function meta(X: number, Fm: number, piMed: number, L: number, H: number, semanas = PREMISSAS.semanasMes): MetaRes | null {
  if (!(piMed > 0) || !(X > 0) || !(L > 0)) return null
  const unidades = ceil((X + Fm) / piMed)
  const lotes = ceil(unidades / L)
  return { unidades, lotes, horas: lotes * H, porSemana: ceil(unidades / Math.max(1, semanas)) }
}
/** F13: retorno por hora = (sobra do lote + a hora dela) / horas do lote; null sem horas */
export function retornoPorHora(lote: number, M: number, H: number): number | null {
  return H > 0 ? round((lote + M) / H) : null
}

// ---------- ferramentas (V1) ----------
export interface EncomendaRes {
  precoUn: number
  sPedido: number
  pi: number
  total: number
  prejuizo: boolean
  /** abatimento máximo (fração) sem passar do preço de empate; null se P = 0 */
  abatimentoMax: number | null
}
/** F17 */
export function encomenda(P: number, c: number, taxaPct: number, taxaFixa: number, frete: number, Q: number, abatPct: number): EncomendaRes | null {
  if (!(Q >= 1)) return null
  const precoUn = round(P * (1 - abatPct / 100))
  const sPedido = round((taxaFixa + frete) / Q)
  const pi = round(precoUn * (1 - taxaPct / 100)) - c - sPedido
  const p0 = precoEmpate(c, sPedido, taxaPct)
  return { precoUn, sPedido, pi, total: pi * Q, prejuizo: pi <= 0, abatimentoMax: P > 0 && p0 !== null ? Math.max(0, 1 - p0 / P) : null }
}
/** F18 fatia: c_f = c x (1 - aparas) / porções + embalagem da porção */
export function custoFatia(c: number, aparasPct: number, porcoes: number, embPorcao: number): number | null {
  if (!(porcoes >= 1)) return null
  return round((c * (1 - aparasPct / 100)) / porcoes) + embPorcao
}
/** F19 kit */
export function custoKit(itens: { q: number; c: number }[], embKit: number, outrosKit: number): number {
  return itens.reduce((s, i) => s + round(i.q * i.c), 0) + embKit + outrosKit
}
/** F20 lista de compras */
export interface Compra {
  ing: string
  qtd: number
  unidade: UnidadeBase
  pacotes: number
  gastoCents: number
  sobra: number
}
export function listaDeCompras(
  planejado: { conta: Conta; lotes: number }[],
  precos: Precos,
): { itens: Compra[]; gasto: number; custoReceitas: number; naoCalculados: string[] } {
  const qtd = new Map<string, number>()
  const nao = new Set<string>()
  let custoReceitas = 0
  const acum = (ing: string, q: number, med: Medida, mult: number) => {
    const k = norm(ing)
    if (GRATIS.includes(k)) return
    const p = precos[k]
    const bq = p ? qtdBase(k, q, med, p.unidade) : null
    if (!p || bq === null) {
      nao.add(k)
      return
    }
    qtd.set(k, (qtd.get(k) ?? 0) + bq * mult)
  }
  const visita = (linhas: Linha[], mult: number, sinal: 1 | -1) => {
    for (const l of linhas) {
      if (l.k === 'b') {
        const b = receitaDe(l.receita)
        if (b) visita(linhasDaReceita(l.receita), (mult * l.un) / b.unidades, sinal)
      } else {
        const q = parseQtd(l.qtd)
        if (Number.isFinite(q)) acum(l.ing, q * (l.neg ? -1 : 1), l.med, mult * sinal)
      }
    }
  }
  for (const { conta, lotes } of planejado) {
    visita(conta.linhas, conta.fator * lotes, 1)
    const r = calcular(conta, precos)
    custoReceitas += r.I * lotes
  }
  const itens: Compra[] = []
  for (const [ing, q] of qtd) {
    const p = precos[ing]
    if (!p || q <= 0) continue
    const pacotes = ceil(q / p.qtdPacote)
    itens.push({ ing, qtd: q, unidade: p.unidade, pacotes, gastoCents: pacotes * p.precoCents, sobra: pacotes * p.qtdPacote - q })
  }
  itens.sort((a, b) => b.gastoCents - a.gastoCents)
  return { itens, gasto: itens.reduce((s, i) => s + i.gastoCents, 0), custoReceitas, naoCalculados: [...nao] }
}
/** F21 perda média real nos últimos 5 lotes registrados */
export function perdaMedia(lotes: { produzidas: number; boas: number }[]): number | null {
  const u = lotes.slice(-5).filter((l) => l.produzidas > 0)
  const prod = u.reduce((s, l) => s + l.produzidas, 0)
  if (!(prod > 0)) return null
  return Math.min(1, Math.max(0, 1 - u.reduce((s, l) => s + Math.min(l.boas, l.produzidas), 0) / prod))
}
/** F23 alerta de alta: ingrediente que subiu (>= 5%) e o que isso faz no custo por unidade desta conta */
export interface Alta {
  ing: string
  antes: number
  depois: number
  altaPct: number
  deltaUn: number
  novaSobra: number | null
}
export function alertasDeAlta(conta: Conta, precosAntes: Precos, precosAgora: Precos): Alta[] {
  const a = calcular(conta, precosAntes)
  const b = calcular(conta, precosAgora)
  const out: Alta[] = []
  if (!a.ok || !b.ok || a.c === null || b.c === null) return out
  const ings = new Set(a.pesos.map((p) => p.ing))
  for (const ing of ings) {
    const p0 = precosAntes[ing]
    const p1 = precosAgora[ing]
    if (!p0 || !p1 || !(p0.qtdPacote > 0) || !(p1.qtdPacote > 0)) continue
    const u0 = p0.precoCents / p0.qtdPacote
    const u1 = p1.precoCents / p1.qtdPacote
    if (!(u0 > 0)) continue
    const alta = u1 / u0 - 1
    if (alta < 0.05 - EPS) continue
    const so = custoLinhas(conta.linhas, { ...precosAntes, [ing]: p1 })
    const antes0 = a.linhas.reduce((s, l) => s + (l.cents ?? 0), 0)
    const novoI = so.reduce((s, l) => s + (l.cents ?? 0), 0)
    const dUn = round(((novoI - antes0) * conta.fator) / b.L)
    const sobra = conta.precoCents !== null ? precoRes(conta.precoCents, b.c, b.K, b.L, conta.taxaPct, b.s).pi : null
    out.push({ ing, antes: p0.precoCents, depois: p1.precoCents, altaPct: alta, deltaUn: dUn, novaSobra: sobra })
  }
  return out.sort((x, y) => y.altaPct - x.altaPct)
}
/** F24 comparar embalagem */
export function compararEmbalagem(
  c: number,
  embAtualUn: number,
  opcoes: { nome: string; embUn: number }[],
  taxaPct: number,
  s: number,
  P: number,
  margemAtual: number | null,
): { nome: string; c: number; pi: number; m: number | null; precoParaManter: number | null }[] {
  return opcoes.map((o) => {
    const ci = c - embAtualUn + o.embUn
    const pi = round(P * (1 - taxaPct / 100)) - ci - s
    const mm = P > 0 ? pi / P : null
    const d = margemAtual === null ? null : 1 - taxaPct / 100 - margemAtual
    return { nome: o.nome, c: ci, pi, m: mm, precoParaManter: d !== null && d > EPS ? ceil((ci + s) / d) : null }
  })
}
/** F25 canais */
export function canais(
  c: number,
  lista: { nome: string; taxaPct: number; taxaFixa: number; frete: number; n: number }[],
  margemPct: number,
  P: number,
  arred: 'real' | 'noventa' | 'nenhum',
): { nome: string; s: number; p0: number | null; pSug: number | null; pi: number }[] {
  return lista.map((ch) => {
    const s = ch.n > 0 ? round((ch.taxaFixa + ch.frete) / ch.n) : 0
    return {
      nome: ch.nome,
      s,
      p0: precoEmpate(c, s, ch.taxaPct),
      pSug: precoSugerido(c, s, ch.taxaPct, margemPct, arred),
      pi: round(P * (1 - ch.taxaPct / 100)) - c - s,
    }
  })
}

// ---------- validação de uma conta (cliente e servidor) ----------
export function contaValida(c: unknown): c is Conta {
  if (!c || typeof c !== 'object') return false
  const x = c as Partial<Conta>
  const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
  return (
    typeof x.id === 'string' &&
    x.id.length > 0 &&
    x.id.length <= 64 &&
    typeof x.nome === 'string' &&
    x.nome.length <= 120 &&
    typeof x.atualizadaEm === 'string' &&
    Array.isArray(x.linhas) &&
    x.linhas.length <= LIMITES.maxLinhas &&
    num(x.rende, 0, LIMITES.maxQtd) &&
    num(x.fator, 0, 1000) &&
    num(x.perdaPct, 0, LIMITES.maxPerdaPct) &&
    num(x.embUnCents, 0, LIMITES.maxCents) &&
    num(x.horas, 0, 1000) &&
    num(x.valorHoraCents, 0, LIMITES.maxCents) &&
    num(x.outrosCents, 0, LIMITES.maxCents) &&
    num(x.taxaPct, 0, LIMITES.maxTaxaPct) &&
    (x.precoCents === null || num(x.precoCents, 0, LIMITES.maxCents)) &&
    !!x.gas &&
    num(x.gas.porFornadaCents, 0, LIMITES.maxCents) &&
    num(x.gas.cabem, 1, 1000)
  )
}
