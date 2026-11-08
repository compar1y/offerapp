import { describe, expect, it } from 'vitest'
import { CUSTO_PRESENTE, diasQueFaltam, podeEscolher, presenteDe } from '../shared/presente'

describe('Presente da Fábrica', () => {
  it('dá 10 moedas por dia de entrada', () => {
    expect(presenteDe(3, null).moedas).toBe(30)
    expect(diasQueFaltam(presenteDe(3, null))).toBe(2)
  })
  it('só deixa escolher com 50 moedas, 1 vez, e um livro que ela não tem', () => {
    expect(podeEscolher(presenteDe(4, null), 'recheios', ['kit'])).toMatch(/Faltam 10/)
    expect(podeEscolher(presenteDe(5, null), 'recheios', ['kit'])).toBe(true)
    expect(podeEscolher(presenteDe(5, null), 'recheios', ['kit', 'recheios'])).toMatch(/já tem/)
    expect(podeEscolher(presenteDe(9, 'primeira'), 'recheios', ['kit', 'primeira'])).toMatch(/já escolheu/)
    expect(podeEscolher(presenteDe(9, null), 'kit', ['recheios'])).toMatch(/não está/)
  })
  it('depois de escolher, as 50 moedas saem do saldo', () => {
    expect(presenteDe(7, 'primeira').moedas).toBe(70 - CUSTO_PRESENTE)
  })
})
