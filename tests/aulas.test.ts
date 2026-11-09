import { describe, expect, it } from 'vitest'
import { AULAS, MODULOS, durLabel, ehAula } from '../shared/aulas'
import { MOEDAS, abrirApp, assistirAula, estadoNovo, sanear } from '../shared/jogo'

const ARQUIVOS = '06-PizzaPaoePasta.mp4, 07-PizzaPaoePasta.mp4, 08-TamiresMota.mp4, 09-testereceitas.mp4, 12-testereceitas.mp4, 13-LeodeniceCamargo.mp4, 14-receitasdepeso.mp4, 15-minharotinasemgluten.mp4, 16-paesdojoao9725.mp4, 17-porflaviamartins.mp4, 19-Celiane.mp4, 21-bonasseoficial.mp4, 22-bonasseoficial.mp4, 23-sabaru_cs.mp4, 27-AchadONsecreto.mp4, 28-Receitasnaotaobemdescritas-Gla.mp4, 33-cameelam.mp4, 34-CanalRodrigoZilio.mp4, 35-Comerebomdemais.mp4, 42-receitas3s480.mp4, 45-LarissaSuellenn.mp4, 46-DicaseReceitasNoemiDuarte.mp4, 48-NathyeEltonof.mp4, 49-Elianekovalsk.mp4, 50-cantinhogourmetdalu7639.mp4'.split(', ')

describe('lista de aulas', () => {
  it('os 25 arquivos certos, cada um uma vez, em 4 módulos', () => {
    expect(AULAS).toHaveLength(25)
    expect([...AULAS.map((a) => a.arquivo)].sort()).toEqual([...ARQUIVOS].sort())
    expect(MODULOS.map((m) => m.aulas.length)).toEqual([10, 8, 4, 3])
  })
  it('títulos sem marca, canal ou inglês', () => {
    const txt = AULAS.map((a) => `${a.titulo} ${a.sub} ${a.modulo.titulo} ${a.modulo.lead}`).join(' ').toLowerCase()
    for (const ruim of ['bonasse', 'youtube', 'canal', 'tamires', 'celiane', 'zilio', 'larissa', 'noemi', 'eliane', 'flavia', 'tutorial', 'chef']) expect(txt).not.toContain(ruim)
  })
  it('nome de arquivo só vale se for de uma aula', () => {
    expect(ehAula('06-PizzaPaoePasta.mp4')).toBe(true)
    expect(ehAula('constructor')).toBe(false)
    expect(ehAula('__proto__')).toBe(false)
  })
  it('duração legível', () => {
    expect(durLabel(12)).toBe('12 s')
    expect(durLabel(60)).toBe('1 min')
    expect(durLabel(106)).toBe('1 min 46 s')
  })
})

describe('aula no jogo', () => {
  const d1 = '2026-11-09'
  it('+5 moedas uma vez por aula e conta a missão do meio', () => {
    let e = abrirApp(estadoNovo(d1), d1)
    const antes = e.moedas
    e = assistirAula(e, ARQUIVOS[0])
    expect(e.aulas).toEqual([ARQUIVOS[0]])
    expect(e.missoes.feitas[1]).toBe(true)
    expect(e.moedas).toBe(antes + MOEDAS.aula + 10)
    const de_novo = assistirAula(e, ARQUIVOS[0])
    expect(de_novo.moedas).toBe(e.moedas)
    expect(de_novo.aulas).toHaveLength(1)
    expect(assistirAula(e, ARQUIVOS[1]).moedas).toBe(e.moedas + MOEDAS.aula)
  })
  it('arquivo que não é aula não dá nada', () => {
    const e = abrirApp(estadoNovo(d1), d1)
    expect(assistirAula(e, 'outro.mp4')).toEqual(e)
  })
  it('estado salvo antes das aulas abre sem quebrar', () => {
    const velho = { ...estadoNovo(d1) } as Partial<ReturnType<typeof estadoNovo>>
    delete velho.aulas
    const e = abrirApp(velho as ReturnType<typeof estadoNovo>, d1)
    expect(e.aulas).toEqual([])
    expect(sanear(velho, d1).aulas).toEqual([])
  })
  it('sanear só guarda aulas reais, sem repetir', () => {
    expect(sanear({ aulas: [ARQUIVOS[0], ARQUIVOS[0], 'constructor', 'x.mp4', 5] }, d1).aulas).toEqual([ARQUIVOS[0]])
  })
})
