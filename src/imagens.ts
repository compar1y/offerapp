import type { MaterialId } from '../shared/catalogo'

// Imagens do app (pasta public/img). Miniaturas de receitas, SOS e capas saem das próprias páginas dos PDFs
// (scripts/gerar-miniaturas.py). As capas que faltam e as cenas virão do Grok (app-novo/imagens/lista-de-imagens.md).
const COM_CAPA = new Set<MaterialId>(['b01', 'b02', 'b03', 'b04', 'b06', 'b07', 'b08', 'fichas-socorro', 'recheios', 'encomenda-puxa-encomenda', 'primeira-encomenda'])

export const fotoReceita = (n: number) => `img/receitas/${String(n).padStart(3, '0')}.webp`
export const fotoSos = (ficha: number) => `img/sos/${String(ficha).padStart(2, '0')}.webp`
export const capa = (m: MaterialId): string | null => (COM_CAPA.has(m) ? `img/capas/${m}.webp` : null)
