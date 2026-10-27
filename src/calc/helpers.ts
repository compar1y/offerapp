import { RECEITAS, INGREDIENTES_BASE, linhasDaReceita, nomeIng, norm, receitaDe, type Conta, type Linha, type Precos } from '../../shared/calc'

/** ingredientes pagos que a conta usa (inclui os da receita-base), na ordem em que aparecem */
export function ingredientesDaConta(c: Conta, precos?: Precos): string[] {
  const out: string[] = []
  const vistos = new Set<string>()
  const visita = (ls: Linha[], prof: number) => {
    for (const l of ls) {
      if (l.k === 'b') {
        if (prof < 4) visita(linhasDaReceita(l.receita), prof + 1)
        continue
      }
      const k = norm(l.ing)
      if (nomeIng(k) === 'Água' && !k.startsWith('x_')) continue
      if (!vistos.has(k)) {
        vistos.add(k)
        out.push(k)
      }
    }
  }
  visita(c.linhas, 0)
  void precos
  return out
}

const MED: Record<string, string> = { g: 'g', ml: 'ml', xic: 'xíc.', cs: 'c. sopa', cc: 'c. chá', un: 'un' }
export const qtdTxt = (qtd: number | string, med: string): string => `${String(qtd).replace('.', ',')} ${MED[med] ?? med}`

/** "200 g + 300 g" (só as linhas da própria conta) */
export function usosDe(c: Conta, ing: string): string {
  const ls = c.linhas.filter((l) => l.k === 'i' && norm(l.ing) === ing && !l.neg)
  return ls.map((l) => (l.k === 'i' ? qtdTxt(l.qtd, l.med) : '')).join(' + ')
}

export const nomeReceita = (n: number | null): string => (n === null ? 'Receita minha' : (receitaDe(n)?.nome ?? `Receita ${n}`))
export const listaReceitas = () => RECEITAS.map((r) => ({ n: r.n, nome: r.nome, secao: r.secao }))
export const secoes = (): string[] => [...new Set(RECEITAS.map((r) => r.secao))]
export const ingredientesBase = () => INGREDIENTES_BASE
export const numeroReceita = (n: number): string => String(n).padStart(3, '0')
