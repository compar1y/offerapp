import { describe, expect, it } from 'vitest'
import { criarToken, lerToken } from '../server/sessao'

describe('sessão', () => {
  const s = 'segredo-de-teste'
  it('assina e lê o e-mail', () => {
    expect(lerToken(criarToken('a@b.com', 0, s), 1000, s)).toBe('a@b.com')
  })
  it('recusa token alterado ou com outro segredo', () => {
    const t = criarToken('a@b.com', 0, s)
    expect(lerToken(t, 1000, 'outro')).toBeNull()
    expect(lerToken('x' + t, 1000, s)).toBeNull()
  })
  it('expira em 90 dias', () => {
    const t = criarToken('a@b.com', 0, s)
    expect(lerToken(t, 89 * 864e5, s)).toBe('a@b.com')
    expect(lerToken(t, 91 * 864e5, s)).toBeNull()
  })
})
