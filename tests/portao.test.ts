// Portão dos arquivos (middleware.ts) e regras de acesso (shared/acesso.ts): nada abre para quem não comprou.
import { createHmac } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware, { emailDoCookie } from '../middleware'
import { ARQUIVOS, arquivosDo, podeBaixar, produtosDe, temCompraReal, type LinhaCompra } from '../shared/acesso'
import { MATERIAIS, type MaterialId } from '../shared/catalogo'
import { criarToken } from '../server/sessao'

const SEGREDO = 'segredo-de-teste'
const pago = (produto: string, metodo = 'pix'): LinhaCompra => ({ produto, status: 'pago', metodo, criado_em: new Date().toISOString() })

let compras: Record<string, LinhaCompra[]> = {}
beforeEach(() => {
  compras = {}
  vi.stubEnv('SESSION_SECRET', SEGREDO)
  vi.stubEnv('SUPABASE_URL', 'https://exemplo.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'chave')
  vi.stubEnv('VITE_AULAS_ACESSO', '')
  vi.stubGlobal('fetch', async (url: string) => {
    const email = decodeURIComponent(/email=eq\.([^&]+)/.exec(url)?.[1] ?? '')
    return new Response(JSON.stringify(compras[email] ?? []), { status: 200 })
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const pedir = (caminho: string, email?: string) =>
  middleware(new Request(`https://app.exemplo${caminho}`, { headers: email ? { cookie: `outro=1; fornada=${criarToken(email, Date.now(), SEGREDO)}` } : {} }))
const passa = (r: Response) => r.headers.get('x-middleware-next') === '1'

describe('cookie de sessão no Edge', () => {
  it('aceita o mesmo token do servidor e recusa mexido, vencido ou com outro segredo', async () => {
    const t = criarToken('maria@x.com', Date.now(), SEGREDO)
    expect(await emailDoCookie(t, SEGREDO)).toBe('maria@x.com')
    expect(await emailDoCookie(t, 'outro')).toBeNull()
    // troca um caractere do meio da assinatura (o último do base64url pode mexer só em bits de sobra e decodificar igual)
    const [d0, s0] = t.split('.')
    const mexida = `${s0.slice(0, 5)}${s0[5] === 'A' ? 'B' : 'A'}${s0.slice(6)}`
    expect(await emailDoCookie(`${d0}.${mexida}`, SEGREDO)).toBeNull()
    const [dado] = t.split('.')
    const falso = Buffer.from(JSON.stringify({ e: 'intrusa@x.com', x: Date.now() + 1e9 })).toString('base64url')
    expect(await emailDoCookie(`${falso}.${t.split('.')[1]}`, SEGREDO)).toBeNull()
    expect(await emailDoCookie(`${dado}.${createHmac('sha256', SEGREDO).update(dado).digest('base64url')}`, SEGREDO)).toBe('maria@x.com')
    expect(await emailDoCookie(criarToken('maria@x.com', Date.now() - 100 * 864e5, SEGREDO), SEGREDO)).toBeNull()
    expect(await emailDoCookie('', SEGREDO)).toBeNull()
  })
})

describe('aulas em vídeo: /aulas/*', () => {
  it('sem login: 401', async () => {
    expect((await pedir('/aulas/aula-01.mp4')).status).toBe(401)
  })
  it('com o kit mas sem as Videoaulas: 403', async () => {
    compras['kit@x.com'] = [pago('kit')]
    expect((await pedir('/aulas/aula-01.mp4', 'kit@x.com')).status).toBe(403)
  })
  it('comprou as Videoaulas: passa', async () => {
    compras['v@x.com'] = [pago('videoaulas')]
    expect(passa(await pedir('/aulas/aula-25.mp4', 'v@x.com'))).toBe(true)
  })
  it('Videoaulas só no PIX pendente ou reembolsada: 403', async () => {
    compras['p@x.com'] = [{ produto: 'videoaulas', status: 'pendente', criado_em: new Date().toISOString() }, pago('kit')]
    compras['r@x.com'] = [{ produto: 'videoaulas', status: 'estornado' }, pago('kit')]
    expect((await pedir('/aulas/aula-01.mp4', 'p@x.com')).status).toBe(403)
    expect((await pedir('/aulas/aula-01.mp4', 'r@x.com')).status).toBe(403)
  })
  it('com VITE_AULAS_ACESSO=kit o kit também abre', async () => {
    vi.stubEnv('VITE_AULAS_ACESSO', 'kit')
    compras['kit@x.com'] = [pago('kit')]
    expect(passa(await pedir('/aulas/aula-01.mp4', 'kit@x.com'))).toBe(true)
  })
  it('arquivo que não é aula (nome antigo, outra pasta, truque no caminho): 404 sem conferir nada', async () => {
    compras['v@x.com'] = [pago('videoaulas')]
    for (const c of ['/aulas/06-PizzaPaoePasta.mp4', '/aulas/', '/aulas/x/aula-01.mp4', '/aulas/constructor', '/aulas/..%2Fdownloads%2Febook-100-receitas.pdf'])
      expect((await pedir(c, 'v@x.com')).status).toBe(404)
  })
})

describe('downloads: /downloads/*', () => {
  it('sem login: 401 em todos os arquivos', async () => {
    for (const a of ARQUIVOS) expect((await pedir(`/downloads/${a.nome}`)).status).toBe(401)
  })
  it('só abre o que cada compra libera', async () => {
    compras['kit@x.com'] = [pago('kit')]
    compras['rech@x.com'] = [pago('recheios')]
    compras['enc@x.com'] = [pago('encomenda')]
    compras['pri@x.com'] = [pago('primeira')]
    compras['vid@x.com'] = [pago('videoaulas')]
    const abre = async (email: string) => {
      const ok: string[] = []
      for (const a of ARQUIVOS) if (passa(await pedir(`/downloads/${a.nome}`, email))) ok.push(a.nome)
      return ok.sort()
    }
    expect(await abre('kit@x.com')).toEqual(
      ['ebook-100-receitas.pdf', 'bonus-01-embalagem.pdf', 'bonus-02-kits-natal.pdf', 'bonus-03-cardapio-fotos.pdf', 'bonus-04-mensagens.pdf', 'bonus-05-guia-planejador.pdf', 'bonus-05-planejador-imprimivel.pdf', 'bonus-05-planejador.xlsx', 'bonus-06-trufado.pdf', 'bonus-07-custo-preco.pdf', 'bonus-08-50-receitas.pdf', 'fichas-socorro.pdf'].sort(),
    )
    expect(await abre('rech@x.com')).toEqual(['recheios-10.pdf'])
    expect(await abre('enc@x.com')).toEqual(['caderninho-clientes.xlsx', 'encomenda-puxa-encomenda.pdf'])
    expect(await abre('pri@x.com')).toEqual(['caderninho-clientes.xlsx', 'primeira-encomenda.pdf'])
    expect(await abre('vid@x.com')).toEqual([])
    expect(await abre('ninguem@x.com')).toEqual([])
  })
  it('livro ganho com moedas sozinho (o resto reembolsado) não abre nada', async () => {
    compras['m@x.com'] = [{ produto: 'kit', status: 'estornado' }, pago('recheios', 'presente')]
    expect((await pedir('/downloads/recheios-10.pdf', 'm@x.com')).status).toBe(403)
    expect((await pedir('/downloads/ebook-100-receitas.pdf', 'm@x.com')).status).toBe(403)
  })
  it('arquivo fora da lista: 404', async () => {
    compras['kit@x.com'] = [pago('kit')]
    for (const c of ['/downloads/', '/downloads/inventario.json', '/downloads/x/ebook-100-receitas.pdf', '/downloads/..%2F..%2Fapi%2Feu']) expect((await pedir(c, 'kit@x.com')).status).toBe(404)
  })
  it('servidor sem configuração ou banco fora do ar: fecha (503), nunca abre', async () => {
    compras['kit@x.com'] = [pago('kit')]
    vi.stubEnv('SESSION_SECRET', '')
    expect((await pedir('/downloads/ebook-100-receitas.pdf', 'kit@x.com')).status).toBe(503)
    vi.stubEnv('SESSION_SECRET', SEGREDO)
    vi.stubGlobal('fetch', async () => new Response('erro', { status: 500 }))
    expect((await pedir('/downloads/ebook-100-receitas.pdf', 'kit@x.com')).status).toBe(503)
  })
})

describe('arquivos no app', () => {
  it('os 16 arquivos estão em public/downloads com o tamanho do inventário, e nada mais', () => {
    expect(readdirSync('public/downloads').sort()).toEqual(ARQUIVOS.map((a) => a.nome).sort())
    for (const a of ARQUIVOS) expect(statSync(`public/downloads/${a.nome}`).size).toBe(a.bytes)
  })
  it('cada material do catálogo tem o que baixar; o Caderninho só a planilha e o bônus 05 também a planilha', () => {
    for (const m of Object.keys(MATERIAIS) as MaterialId[]) expect(arquivosDo(m).length).toBeGreaterThan(0)
    expect(arquivosDo('caderninho').map((a) => a.tipo)).toEqual(['planilha'])
    expect(arquivosDo('b05-guia').map((a) => a.nome)).toEqual(['bonus-05-guia-planejador.pdf', 'bonus-05-planejador.xlsx'])
  })
  it('vercel.json manda baixar (attachment) e não guardar em cache público', () => {
    const v = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }
    const d = v.headers.find((h) => h.source === '/downloads/(.*)')!.headers
    expect(d).toContainEqual({ key: 'Content-Disposition', value: 'attachment' })
    expect(d.find((h) => h.key === 'Cache-Control')!.value).toMatch(/private/)
    expect(v.headers.find((h) => h.source === '/aulas/(.*)')!.headers[0].value).toMatch(/private/)
  })
  it('a planilha do Caderninho só para Encomenda ou Primeira', () => {
    const cad = ARQUIVOS.find((a) => a.nome === 'caderninho-clientes.xlsx')!
    expect(podeBaixar(['kit', 'recheios', 'videoaulas'], cad)).toBe(false)
    expect(podeBaixar(['encomenda'], cad)).toBe(true)
    expect(podeBaixar(['primeira'], cad)).toBe(true)
  })
})

describe('regras de acesso', () => {
  const h = (horas: number) => new Date(Date.now() - horas * 3600e3).toISOString()
  it('PIX pendente vale 24 h', () => {
    expect(produtosDe([{ produto: 'encomenda', status: 'pendente', atualizado_em: h(2) }]).pendentes).toEqual(['encomenda'])
    expect(produtosDe([{ produto: 'encomenda', status: 'pendente', atualizado_em: h(25) }]).pendentes).toEqual([])
    expect(produtosDe([{ produto: 'encomenda', status: 'pendente', atualizado_em: h(1) }, pago('encomenda')]).pendentes).toEqual([])
  })
  it('presente de moedas só vale com uma compra real paga', () => {
    expect(produtosDe([pago('kit'), pago('recheios', 'presente')]).produtos.sort()).toEqual(['kit', 'recheios'])
    expect(produtosDe([{ produto: 'kit', status: 'estornado' }, pago('recheios', 'presente')]).produtos).toEqual([])
    expect(temCompraReal([pago('recheios', 'presente')])).toBe(false)
    expect(temCompraReal([pago('kit')])).toBe(true)
  })
})
