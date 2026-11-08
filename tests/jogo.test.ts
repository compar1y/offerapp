import { describe, expect, it } from 'vitest'
import { materiaisLiberados } from '../shared/catalogo'
import { ETAPAS, perfilDe } from '../shared/conteudo'
import { abrirApp, abrirBau, concluirLicao, estadoNovo, fazerMissaoDoPerfil, fazerReceita, hojeBR, sanear, semanaDe, trocar, type Estado } from '../shared/jogo'

describe('perfil pelas 5 respostas', () => {
  it('família desacreditando vem primeiro', () => expect(perfilDe([0, 0, 2, 0, 0])).toBe('desacreditada'))
  it('vergonha de oferecer e já cozinha', () => expect(perfilDe([0, 1, 2, 2, 1])).toBe('semClientes'))
  it('não sabe cobrar', () => expect(perfilDe([0, 2, 2, 2, 0])).toBe('semPreco'))
  it('rotina corrida', () => expect(perfilDe([0, 0, 0, 2, 0])).toBe('corrida'))
  it('o resto é iniciante', () => expect(perfilDe([0, 0, 2, 2, 0])).toBe('iniciante'))
})

describe('o que cada compra libera', () => {
  it('kit libera e-book, SOS e os 8 bônus; não libera upsell', () => {
    const m = materiaisLiberados(['kit'])
    expect(m).toContain('ebook')
    expect(m).toContain('fichas-socorro')
    expect(m).toContain('b08')
    expect(m).not.toContain('encomenda-puxa-encomenda')
  })
  it('upsell libera o caderninho', () => expect(materiaisLiberados(['encomenda'])).toContain('caderninho'))
})

describe('gamificação', () => {
  const d1 = '2026-11-09'
  it('dia no fuso de Brasília', () => expect(hojeBR(new Date('2026-11-10T02:00:00Z'))).toBe('2026-11-09'))
  it('semana começa na segunda', () => expect(semanaDe('2026-11-15')).toBe('2026-11-09'))

  it('3 missões dão moedas e um presente prata', () => {
    let e = abrirApp(estadoNovo(d1), d1)
    e = concluirLicao(e, '1.1').estado
    e = fazerMissaoDoPerfil(e)
    expect(e.missoes.feitas).toEqual([true, true, true])
    expect(e.baus).toContain('prata')
    expect(e.moedas).toBe(10 * 3 + 30 + 20)
  })

  it('sequência continua com 1 dia de folga e quebra com 3', () => {
    let e = abrirApp(estadoNovo(d1), d1)
    e = abrirApp(e, '2026-11-11')
    expect(e.seq.dias).toBe(2)
    e = abrirApp(e, '2026-11-14')
    expect(e.seq.dias).toBe(1)
  })

  it('7 dias seguidos dão presente diamante', () => {
    let e = estadoNovo(d1)
    for (let i = 0; i < 7; i++) e = abrirApp(e, `2026-11-${String(9 + i).padStart(2, '0')}`)
    expect(e.baus).toContain('diamante')
    expect(e.selos).toContain('sete-dias')
  })

  it('terminar a etapa 1 dá presente ouro e selo; lição repetida não paga de novo', () => {
    let e = estadoNovo(d1)
    let fim
    for (const l of ETAPAS[0].licoes) ({ estado: e, etapaConcluida: fim } = concluirLicao(e, l.id) as { estado: typeof e; etapaConcluida?: number })
    expect(fim).toBe(1)
    expect(e.baus).toContain('ouro')
    expect(e.selos).toContain('primeira-foto')
    const antes = e.moedas
    expect(concluirLicao(e, '1.1').estado.moedas).toBe(antes)
  })

  it('missão secreta: receitas em 2 dias diferentes da semana', () => {
    let e = abrirApp(estadoNovo(d1), d1)
    e = fazerReceita(e, 1)
    expect(e.secreta.feita).toBe(false)
    e = abrirApp(e, '2026-11-10')
    e = fazerReceita(e, 2)
    expect(e.secreta.feita).toBe(true)
  })

  it('abrir baú soma o prêmio fixo; trocar exige moedas', () => {
    let e: Estado = { ...estadoNovo(d1), baus: ['ouro'] }
    e = abrirBau(e, 'ouro').estado
    expect(e.moedas).toBe(80)
    expect(trocar(e, 'x', 100)).toBeNull()
    expect(trocar(e, 'x', 60)?.moedas).toBe(20)
  })

  it('sanear corrige lixo vindo do navegador', () => {
    const e = sanear({ moedas: -5, receitas: [1, 999, 'x'], baus: ['ouro', 'falso'], missoes: { feitas: [1] } }, d1)
    expect(e.moedas).toBe(0)
    expect(e.receitas).toEqual([1])
    expect(e.baus).toEqual(['ouro'])
    expect(e.missoes.feitas).toEqual([false, false, false])
  })
})
