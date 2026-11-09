// Regras puras de acesso, usadas pelo servidor (server/acesso.ts), pelo portão dos arquivos (middleware.ts) e pelo app.
// Sem Supabase e sem Node aqui: o middleware roda no Edge da Vercel.
import { ehProduto, materiaisLiberados, type MaterialId, type ProdutoId } from './catalogo.js'

export interface LinhaCompra {
  produto: string
  status: string
  metodo?: string | null
  criado_em?: string | null
  atualizado_em?: string | null
}

/** PIX gerado e não pago deixa de aparecer como "aguardando" depois disso (a Wiapy não avisa quando o PIX expira) */
export const PIX_PENDENTE_HORAS = 24

/**
 * O que está pago e o que está aguardando.
 * O livro ganho com moedas (metodo 'presente') só vale enquanto existir uma compra paga de verdade:
 * se ela for reembolsada de tudo, o presente fecha junto e o app fecha.
 */
export function produtosDe(linhas: LinhaCompra[], agora = Date.now()): { produtos: ProdutoId[]; pendentes: ProdutoId[] } {
  const pagas = linhas.filter((c) => c.status === 'pago' && ehProduto(c.produto))
  const reais = pagas.filter((c) => c.metodo !== 'presente')
  const produtos = [...new Set((reais.length ? pagas : []).map((c) => c.produto as ProdutoId))]
  const limite = agora - PIX_PENDENTE_HORAS * 3600e3
  const pendentes = [
    ...new Set(
      linhas
        .filter((c) => c.status === 'pendente' && ehProduto(c.produto) && !produtos.includes(c.produto as ProdutoId))
        .filter((c) => Date.parse(c.atualizado_em ?? c.criado_em ?? '') > limite)
        .map((c) => c.produto as ProdutoId),
    ),
  ]
  return { produtos, pendentes }
}

/** tem pelo menos uma compra paga de verdade (o presente de moedas sozinho não abre o app) */
export const temCompraReal = (linhas: LinhaCompra[]): boolean => linhas.some((c) => c.status === 'pago' && c.metodo !== 'presente' && ehProduto(c.produto))

export type ModoAulas = 'venda' | 'kit'
/** 'venda' (padrão): só quem comprou as Videoaulas. 'kit' (VITE_AULAS_ACESSO=kit): quem tem o kit também. */
export const podeVerAulasCom = (produtos: ProdutoId[], modo: ModoAulas): boolean => produtos.includes('videoaulas') || (modo === 'kit' && produtos.includes('kit'))

/**
 * Arquivos para baixar (PDF e planilha). Ficam em public/downloads/ e só saem pelo middleware.ts,
 * que confere a sessão e se ela tem algum dos `materiais` do arquivo. Sem compra, 403.
 */
export interface Arquivo {
  nome: string
  tipo: 'pdf' | 'planilha'
  /** abre para quem tem qualquer um destes materiais */
  materiais: MaterialId[]
  bytes: number
}

export const ARQUIVOS: Arquivo[] = [
  { nome: 'ebook-100-receitas.pdf', tipo: 'pdf', materiais: ['ebook'], bytes: 15603897 },
  { nome: 'bonus-01-embalagem.pdf', tipo: 'pdf', materiais: ['b01'], bytes: 4527539 },
  { nome: 'bonus-02-kits-natal.pdf', tipo: 'pdf', materiais: ['b02'], bytes: 8611503 },
  { nome: 'bonus-03-cardapio-fotos.pdf', tipo: 'pdf', materiais: ['b03'], bytes: 3298847 },
  { nome: 'bonus-04-mensagens.pdf', tipo: 'pdf', materiais: ['b04'], bytes: 4786136 },
  { nome: 'bonus-05-guia-planejador.pdf', tipo: 'pdf', materiais: ['b05-guia'], bytes: 2720386 },
  { nome: 'bonus-05-planejador-imprimivel.pdf', tipo: 'pdf', materiais: ['b05-imprimivel'], bytes: 1194910 },
  // a planilha do planejador não tem leitor de páginas: aparece nos dois materiais do bônus 05
  { nome: 'bonus-05-planejador.xlsx', tipo: 'planilha', materiais: ['b05-guia', 'b05-imprimivel'], bytes: 106972 },
  { nome: 'bonus-06-trufado.pdf', tipo: 'pdf', materiais: ['b06'], bytes: 3514985 },
  { nome: 'bonus-07-custo-preco.pdf', tipo: 'pdf', materiais: ['b07'], bytes: 15369159 },
  { nome: 'bonus-08-50-receitas.pdf', tipo: 'pdf', materiais: ['b08'], bytes: 9004539 },
  { nome: 'fichas-socorro.pdf', tipo: 'pdf', materiais: ['fichas-socorro'], bytes: 8960586 },
  { nome: 'recheios-10.pdf', tipo: 'pdf', materiais: ['recheios'], bytes: 3106776 },
  { nome: 'encomenda-puxa-encomenda.pdf', tipo: 'pdf', materiais: ['encomenda-puxa-encomenda'], bytes: 8222619 },
  { nome: 'primeira-encomenda.pdf', tipo: 'pdf', materiais: ['primeira-encomenda'], bytes: 6967448 },
  // o Caderninho é liberado pela Encomenda OU pela Primeira (PRODUTOS[...].libera)
  { nome: 'caderninho-clientes.xlsx', tipo: 'planilha', materiais: ['caderninho'], bytes: 8395 },
]

export const arquivoPorNome = (nome: string): Arquivo | undefined => ARQUIVOS.find((a) => a.nome === nome)
export const arquivosDo = (m: MaterialId): Arquivo[] => ARQUIVOS.filter((a) => a.materiais.includes(m))
export const podeBaixar = (produtos: ProdutoId[], a: Arquivo): boolean => {
  const tem = materiaisLiberados(produtos)
  return a.materiais.some((m) => tem.includes(m))
}
