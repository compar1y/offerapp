// Regras da gamificação (puras, testáveis). O estado mora no servidor (tabela usuarias.estado) e o app aplica as ações.
// Regras da base: só ações reais dela, sem contador falso, sem ranking, e moedas e selos nunca se perdem.
import { ETAPAS } from './conteudo.js'
import { ehAula } from './aulas.js'

export type BauId = 'prata' | 'ouro' | 'diamante' | 'cristal'
export type SeloId = 'primeira-foto' | 'etapa-1' | 'etapa-2' | 'etapa-3' | 'etapa-4' | 'etapa-5' | 'sete-dias' | 'cinco-receitas' | 'sos-usado'

export interface Estado {
  moedas: number
  seq: { dias: number; ultimoDia: string }
  missoes: { dia: string; feitas: [boolean, boolean, boolean] }
  licoes: string[]
  receitas: number[]
  /** baús ganhos e ainda fechados */
  baus: BauId[]
  abertos: number
  itens: string[]
  selos: SeloId[]
  /** ofertas que já apareceram ao fim de uma etapa (aparecem 1 vez) */
  ofertasVistas: string[]
  secreta: { semana: string; receitasDias: string[]; feita: boolean }
  /** aulas em vídeo já assistidas (nome do arquivo .mp4) */
  aulas: string[]
}

export const MOEDAS = { licao: 20, receita: 15, missao: 10, tresMissoes: 30, secreta: 100, aula: 5 }

export function estadoNovo(hoje: string): Estado {
  return {
    moedas: 0,
    seq: { dias: 0, ultimoDia: '' },
    missoes: { dia: hoje, feitas: [false, false, false] },
    licoes: [],
    receitas: [],
    baus: [],
    abertos: 0,
    itens: [],
    selos: [],
    ofertasVistas: [],
    secreta: { semana: semanaDe(hoje), receitasDias: [], feita: false },
    aulas: [],
  }
}

/** dia no fuso de Brasília, AAAA-MM-DD */
export function hojeBR(d = new Date()): string {
  return new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10)
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

/** segunda-feira da semana do dia */
export function semanaDe(dia: string): string {
  const d = new Date(dia + 'T12:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

function ganharBau(e: Estado, b: BauId) {
  e.baus.push(b)
}
function selo(e: Estado, s: SeloId) {
  if (!e.selos.includes(s)) e.selos.push(s)
}

/** ao abrir o app: vira o dia das missões, conta a sequência (quebra se passar 2 dias sem nada) e marca a missão "abrir o app" */
export function abrirApp(e: Estado, hoje: string): Estado {
  const n: Estado = structuredClone(e)
  if (n.missoes.dia !== hoje) n.missoes = { dia: hoje, feitas: [false, false, false] }
  if (n.secreta.semana !== semanaDe(hoje)) n.secreta = { semana: semanaDe(hoje), receitasDias: [], feita: false }
  if (!Array.isArray(n.aulas)) n.aulas = [] // estado salvo antes das aulas
  marcarMissao(n, 0)
  return n
}

/** conta o dia na sequência (Fornadas Seguidas) quando ela faz qualquer missão */
function contarDia(n: Estado) {
  const hoje = n.missoes.dia
  if (n.seq.ultimoDia === hoje) return
  const gap = n.seq.ultimoDia ? diasEntre(n.seq.ultimoDia, hoje) : 99
  n.seq.dias = gap <= 2 ? n.seq.dias + 1 : 1
  n.seq.ultimoDia = hoje
  if (n.seq.dias > 0 && n.seq.dias % 7 === 0) {
    ganharBau(n, 'diamante')
    selo(n, 'sete-dias')
  }
}

function marcarMissao(n: Estado, i: 0 | 1 | 2) {
  if (n.missoes.feitas[i]) return
  n.missoes.feitas[i] = true
  n.moedas += MOEDAS.missao
  contarDia(n)
  if (n.missoes.feitas.every(Boolean)) {
    n.moedas += MOEDAS.tresMissoes
    ganharBau(n, 'prata')
  }
}

export function fazerMissaoDoPerfil(e: Estado): Estado {
  const n = structuredClone(e)
  marcarMissao(n, 2)
  return n
}

export interface Resultado { estado: Estado; etapaConcluida?: number; jornadaConcluida?: boolean }

export function concluirLicao(e: Estado, id: string): Resultado {
  const n = structuredClone(e)
  if (n.licoes.includes(id)) return { estado: n }
  n.licoes.push(id)
  n.moedas += MOEDAS.licao
  marcarMissao(n, 1)
  if (id === '1.5') selo(n, 'primeira-foto')
  const etapa = ETAPAS.find((et) => et.licoes.some((l) => l.id === id))!
  let etapaConcluida: number | undefined
  if (etapa.licoes.every((l) => n.licoes.includes(l.id))) {
    etapaConcluida = etapa.n
    ganharBau(n, 'ouro')
    selo(n, `etapa-${etapa.n}` as SeloId)
  }
  const jornadaConcluida = ETAPAS.every((et) => et.licoes.every((l) => n.licoes.includes(l.id)))
  if (jornadaConcluida && etapaConcluida) ganharBau(n, 'cristal')
  return { estado: n, etapaConcluida, jornadaConcluida: jornadaConcluida && !!etapaConcluida }
}

export function fazerReceita(e: Estado, num: number): Estado {
  const n = structuredClone(e)
  if (n.receitas.includes(num)) return n
  n.receitas.push(num)
  n.moedas += MOEDAS.receita
  marcarMissao(n, 1)
  if (n.receitas.length >= 5) selo(n, 'cinco-receitas')
  // missão secreta da semana: fazer receitas em 2 dias diferentes da mesma semana
  const hoje = n.missoes.dia
  if (!n.secreta.feita && !n.secreta.receitasDias.includes(hoje)) {
    n.secreta.receitasDias.push(hoje)
    if (n.secreta.receitasDias.length >= 2) {
      n.secreta.feita = true
      n.moedas += MOEDAS.secreta
    }
  }
  return n
}

/** aula em vídeo assistida (chegou ao fim ou tocou em "Já assisti"): +5 moedas uma vez por aula e conta como a missão
 * "Fazer uma lição, uma receita ou assistir a uma aula". Rever a mesma aula não paga de novo. Nada fica trancado por moeda. */
export function assistirAula(e: Estado, arquivo: string): Estado {
  const n = structuredClone(e)
  if (!Array.isArray(n.aulas)) n.aulas = []
  if (!ehAula(arquivo) || n.aulas.includes(arquivo)) return n
  n.aulas.push(arquivo)
  n.moedas += MOEDAS.aula
  marcarMissao(n, 1)
  return n
}

export interface Premio { raridade: 'Comum' | 'Rara' | 'Lendária'; titulo: string; moedas: number }

/** abre o baú mais antigo. Prêmio em moedas: prata 50, ouro 80, diamante 150, cristal 300 (sem sorteio escondido: o valor é fixo por baú) */
export const PREMIO_BAU: Record<BauId, Premio> = {
  prata: { raridade: 'Comum', titulo: '+50 Moedas Douradas', moedas: 50 },
  ouro: { raridade: 'Rara', titulo: '+80 Moedas Douradas', moedas: 80 },
  diamante: { raridade: 'Rara', titulo: '+150 Moedas Douradas', moedas: 150 },
  cristal: { raridade: 'Lendária', titulo: '+300 Moedas Douradas', moedas: 300 },
}

export function abrirBau(e: Estado, b: BauId): { estado: Estado; premio?: Premio } {
  const n = structuredClone(e)
  const i = n.baus.indexOf(b)
  if (i < 0) return { estado: n }
  n.baus.splice(i, 1)
  n.abertos += 1
  const premio = PREMIO_BAU[b]
  n.moedas += premio.moedas
  return { estado: n, premio }
}

/** Ingrediente Secreto (raspadinha) ao concluir uma etapa: o prêmio depende da etapa, não de sorte */
export function premioRaspadinha(etapa: number): Premio {
  if (etapa >= 5) return { raridade: 'Lendária', titulo: '+200 Moedas Douradas', moedas: 200 }
  if (etapa >= 3) return { raridade: 'Rara', titulo: '+100 Moedas Douradas', moedas: 100 }
  return { raridade: 'Comum', titulo: '+60 Moedas Douradas', moedas: 60 }
}

export function receberRaspadinha(e: Estado, etapa: number): Estado {
  const n = structuredClone(e)
  const chave = `raspa-${etapa}`
  if (n.ofertasVistas.includes(chave)) return n
  n.ofertasVistas.push(chave)
  n.moedas += premioRaspadinha(etapa).moedas
  return n
}

export function trocar(e: Estado, itemId: string, custo: number): Estado | null {
  if (e.itens.includes(itemId) || e.moedas < custo) return null
  const n = structuredClone(e)
  n.moedas -= custo
  n.itens.push(itemId)
  return n
}

/** confere e corrige um estado vindo do app antes de salvar (tipos e limites), para nunca quebrar a leitura */
export function sanear(x: unknown, hoje: string): Estado {
  const b = estadoNovo(hoje)
  if (!x || typeof x !== 'object') return b
  const o = x as Record<string, unknown>
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 1e6) : d)
  const strs = (v: unknown, max = 200) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length < 40).slice(0, max) : [])
  const nums = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is number => Number.isInteger(s) && s >= 1 && s <= 100).slice(0, 100) : [])
  const seq = (o.seq ?? {}) as Record<string, unknown>
  const mis = (o.missoes ?? {}) as Record<string, unknown>
  const sec = (o.secreta ?? {}) as Record<string, unknown>
  const feitas = Array.isArray(mis.feitas) && mis.feitas.length === 3 ? (mis.feitas.map(Boolean) as [boolean, boolean, boolean]) : b.missoes.feitas
  const bauIds: BauId[] = ['prata', 'ouro', 'diamante', 'cristal']
  return {
    moedas: num(o.moedas, 0),
    seq: { dias: num(seq.dias, 0), ultimoDia: typeof seq.ultimoDia === 'string' ? seq.ultimoDia.slice(0, 10) : '' },
    missoes: { dia: typeof mis.dia === 'string' ? mis.dia.slice(0, 10) : hoje, feitas },
    licoes: strs(o.licoes, 50),
    receitas: nums(o.receitas),
    baus: strs(o.baus, 50).filter((s): s is BauId => bauIds.includes(s as BauId)),
    abertos: num(o.abertos, 0),
    itens: strs(o.itens, 50),
    selos: strs(o.selos, 30) as SeloId[],
    ofertasVistas: strs(o.ofertasVistas, 50),
    secreta: {
      semana: typeof sec.semana === 'string' ? sec.semana.slice(0, 10) : b.secreta.semana,
      receitasDias: strs(sec.receitasDias, 7),
      feita: Boolean(sec.feita),
    },
    aulas: [...new Set(strs(o.aulas, 50).filter(ehAula))],
  }
}
