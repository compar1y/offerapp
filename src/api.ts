import type { Presente } from '../shared/presente'
import type { MaterialId, ProdutoId } from '../shared/catalogo'
import type { PerfilId } from '../shared/conteudo'
import type { Estado } from '../shared/jogo'
import type { Desconto } from '../shared/desconto'
import type { UpsellPopup } from '../shared/popupDesconto'
import { ajustarRelogio } from './relogio'

export interface OfertaDesconto { checkoutUrl: string; precoCentavos: number; pct: number; ate: string }
export interface Acesso {
  produtos: ProdutoId[]; pendentes: ProdutoId[]; materiais: MaterialId[]; desconto?: Desconto | null; ganhaPresente?: boolean
  popup?: { comprado: UpsellPopup; oferta: UpsellPopup; ate: string } | null
  /** links com desconto: o servidor só manda enquanto o prazo de 3 h vale */
  ofertasDesconto?: Partial<Record<UpsellPopup, OfertaDesconto>>
  agora?: string
}
export interface Eu {
  email: string
  perfil: PerfilId | null
  respostas: number[] | null
  avatar: number | null
  apelido: string
  estado: Estado | null
  acesso: Acesso
  presente: Presente
}

export class ErroApi extends Error {
  constructor(msg: string, public status: number) {
    super(msg)
  }
}

async function pedir<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let r: Response
  try {
    r = await fetch(caminho, { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  } catch {
    throw new ErroApi('Sem internet agora. Confira a conexão e tente de novo.', 0)
  }
  const j = (await r.json().catch(() => ({}))) as { erro?: string }
  if (!r.ok) throw new ErroApi(j.erro ?? 'Algo deu errado. Tente de novo.', r.status)
  return j as T
}

export type Salvavel = Partial<Pick<Eu, 'perfil' | 'respostas' | 'avatar' | 'apelido' | 'estado'>>

export const api = {
  entrar: (email: string) => pedir<{ ok: true }>('/api/entrar', { method: 'POST', body: JSON.stringify({ email }) }),
  sair: () => pedir<{ ok: true }>('/api/sair', { method: 'POST' }),
  eu: () => pedir<Eu>('/api/eu').then((e) => { ajustarRelogio(e.acesso?.agora); return e }),
  salvar: (dados: Salvavel, keepalive = false) => pedir<{ ok: true }>('/api/eu', { method: 'POST', body: JSON.stringify(dados), keepalive }),
  presente: (produto: ProdutoId) => pedir<{ ok: true }>('/api/presente', { method: 'POST', body: JSON.stringify({ produto }) }),
  evento: (tipo: string, dados: Record<string, unknown> = {}) => {
    pedir('/api/evento', { method: 'POST', body: JSON.stringify({ tipo, dados }), keepalive: true }).catch(() => {})
  },
}

export const urlPagina = (m: MaterialId, p: number) =>
  import.meta.env.VITE_DEMO === '1' ? `paginas/${m}/${String(p).padStart(3, '0')}.webp` : `/api/pagina?m=${encodeURIComponent(m)}&p=${p}`
