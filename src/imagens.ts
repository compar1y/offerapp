import type { MaterialId, ProdutoId } from '../shared/catalogo'

// Imagens do app (pasta public/img).
// - receitas, sos e a maioria das capas saem das próprias páginas dos PDFs (scripts/gerar-miniaturas.py)
// - cenas, etapas, perfis, baús, mockups e as 4 capas que faltavam vieram do Grok (app-novo/imagens/prompt-grok-imagens-app.md)
export const fotoReceita = (n: number) => `img/receitas/${String(n).padStart(3, '0')}.webp`
export const fotoSos = (ficha: number) => `img/sos/${String(ficha).padStart(2, '0')}.webp`
export const capa = (m: MaterialId) => `img/capas/${m}.webp`
export const cena = (c: 'sos' | 'receitas' | 'presentes' | 'boas-vindas') => `img/cenas/${c}.webp`
export const fotoEtapa = (n: number) => `img/modulos/${n}.webp`
export const fotoBau = (b: string) => `img/baus/${b}.webp`

const PERFIL_ARQ: Record<string, string> = { desacreditada: 'desacreditada', semClientes: 'sem-clientes', semPreco: 'sem-preco', corrida: 'corrida', iniciante: 'iniciante' }
export const fotoPerfil = (p: string) => `img/perfis/${PERFIL_ARQ[p] ?? 'iniciante'}.webp`

const MOCKUP: Partial<Record<ProdutoId, string>> = { recheios: 'recheios', encomenda: 'encomenda', primeira: 'primeira' }
export const mockup = (p: ProdutoId) => (MOCKUP[p] ? `img/mockups/${MOCKUP[p]}.webp` : null)
