// Onde as páginas estão no armazenamento. O esperado é "ebook/001.webp" na raiz do bucket "paginas",
// mas quem sobe pelo painel do Supabase às vezes arrasta a pasta de fora junto ("paginas/ebook/001.webp").
// Aqui o servidor descobre o prefixo sozinho e guarda enquanto a função estiver viva.
import { BUCKET, db } from './db.js'

let prefixoCache: string | null = null

async function pastas(caminho: string): Promise<string[]> {
  const { data, error } = await db().storage.from(BUCKET).list(caminho, { limit: 1000 })
  if (error) throw error
  return (data ?? []).filter((x) => x.id === null).map((x) => x.name) // id null = pasta
}

/** procura a pasta "ebook" até 3 níveis abaixo da raiz e devolve o prefixo ("" quando está na raiz) */
export async function prefixoDasPaginas(): Promise<string | null> {
  if (prefixoCache !== null) return prefixoCache
  const fila: string[] = ['']
  for (let nivel = 0; nivel < 3 && fila.length; nivel++) {
    const proximos: string[] = []
    for (const base of fila) {
      const filhos = await pastas(base)
      if (filhos.includes('ebook')) return (prefixoCache = base ? `${base}/` : '')
      proximos.push(...filhos.map((f) => (base ? `${base}/${f}` : f)))
    }
    fila.splice(0, fila.length, ...proximos.slice(0, 30))
  }
  return null
}

/** resumo do que está no armazenamento, para o painel */
export async function diagnosticoArmazenamento() {
  const raiz = await db().storage.from(BUCKET).list('', { limit: 1000 })
  if (raiz.error) return { erro: raiz.error.message }
  const itens = raiz.data ?? []
  const prefixo = await prefixoDasPaginas().catch(() => null)
  const porPasta: Record<string, number> = {}
  if (prefixo !== null) {
    for (const p of await pastas(prefixo.replace(/\/$/, ''))) {
      const { data } = await db().storage.from(BUCKET).list(`${prefixo}${p}`, { limit: 1000 })
      porPasta[p] = (data ?? []).filter((x) => x.id !== null).length
    }
  }
  return {
    raiz: itens.slice(0, 40).map((x) => (x.id === null ? `${x.name}/` : x.name)),
    totalNaRaiz: itens.length,
    prefixoEncontrado: prefixo,
    paginasPorPasta: porPasta,
  }
}
