import { describe, expect, it, vi, beforeEach } from 'vitest'

// armazenamento falso: chave = pasta, valor = nomes de subpastas
let arvore: Record<string, string[]> = {}
vi.mock('../server/db', () => ({
  BUCKET: 'paginas',
  db: () => ({
    storage: { from: () => ({ list: async (c: string) => ({ data: (arvore[c] ?? []).map((name) => ({ name, id: null })), error: null }) }) },
  }),
}))

describe('onde estão as páginas', () => {
  beforeEach(() => vi.resetModules())
  it('na raiz do bucket', async () => {
    arvore = { '': ['ebook', 'b01'] }
    const { prefixoDasPaginas } = await import('../server/paginas')
    expect(await prefixoDasPaginas()).toBe('')
  })
  it('dentro da pasta que foi arrastada junto', async () => {
    arvore = { '': ['paginas-para-supabase'], 'paginas-para-supabase': ['ebook', 'b01'] }
    const { prefixoDasPaginas } = await import('../server/paginas')
    expect(await prefixoDasPaginas()).toBe('paginas-para-supabase/')
  })
  it('dois níveis abaixo', async () => {
    arvore = { '': ['a'], a: ['b'], 'a/b': ['ebook'] }
    const { prefixoDasPaginas } = await import('../server/paginas')
    expect(await prefixoDasPaginas()).toBe('a/b/')
  })
  it('sem a pasta ebook', async () => {
    arvore = { '': ['outra'] }
    const { prefixoDasPaginas } = await import('../server/paginas')
    expect(await prefixoDasPaginas()).toBeNull()
  })
})
