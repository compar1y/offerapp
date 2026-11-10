// Barra fixa no rodapé (src/telas/Navbar.tsx): onde aparece, item aceso e a bolinha da Seleção especial.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Eu } from '../src/api'
import { CtxReact, type Ctx, type Tela } from '../src/ctx'
import { abaAtiva, contagemSelecao, mostrarNavbar, Navbar } from '../src/telas/Navbar'
import { ofertasSelecao } from '../src/telas/Painel'
import { materiaisLiberados, type ProdutoId } from '../shared/catalogo'

const euCom = (produtos: ProdutoId[]): Eu =>
  ({
    email: 'm@x.com', perfil: null, respostas: null, avatar: null, apelido: 'Maria', estado: null,
    acesso: { produtos, pendentes: [], materiais: materiaisLiberados(produtos), ganhaPresente: false, desconto: null, popup: null, ofertasDesconto: {}, agora: new Date().toISOString() },
  }) as unknown as Eu

const nada = () => {}
const html = (tela: Tela, eu = euCom(['kit']), popupAberto = false) => {
  const ctx = { eu, estado: {}, ir: nada, trocar: nada, voltar: nada, mudar: nada, salvarPerfil: nada, toast: nada, evento: nada, recarregar: nada, sair: nada } as unknown as Ctx
  return renderToStaticMarkup(createElement(CtxReact.Provider, { value: ctx }, createElement(Navbar, { tela, popupAberto })))
}

describe('barra do rodapé: onde aparece', () => {
  it('aparece no Início e nas telas internas (oferta, material, receitas, socorro, aulas, ferramentas)', () => {
    const telas: Tela[] = [{ t: 'painel' }, { t: 'oferta', p: 'recheios', origem: 'painel' }, { t: 'videoaulas' }, { t: 'ler', m: 'b01', p: 1 }, { t: 'receitas' }, { t: 'sos' }, { t: 'aulas' }, { t: 'etiquetas' }, { t: 'contafeita' }, { t: 'materiais' }]
    for (const t of telas) {
      expect(mostrarNavbar(t, false), t.t).toBe(true)
      expect(html(t), t.t).toContain('<nav class="navbar"')
    }
  })
  it('some no onboarding', () => {
    for (const t of ['boas', 'pergunta', 'resultado', 'avatar'] as const) {
      expect(mostrarNavbar({ t }, false)).toBe(false)
      expect(html({ t })).toBe('')
    }
  })
  it('some com o popup de oferta aberto, em qualquer tela', () => {
    expect(mostrarNavbar({ t: 'painel' }, true)).toBe(false)
    expect(html({ t: 'etiquetas' }, euCom(['kit', 'etiquetas']), true)).toBe('')
  })
  it('some no player de aula em tela cheia (ele tem o próprio botão de fechar)', () => {
    expect(html({ t: 'aula', a: 'aula-01.mp4' })).toBe('')
  })
  it('some no login: a barra só existe dentro do app (App.tsx monta a Navbar depois do Entrar)', async () => {
    const fs = await import('node:fs')
    const app = fs.readFileSync('src/App.tsx', 'utf8')
    const entrar = app.indexOf("if (fase.f === 'entrar') return <Entrar")
    const barra = app.indexOf('<Navbar tela={tela} popupAberto=')
    expect(entrar).toBeGreaterThan(0)
    expect(barra).toBeGreaterThan(entrar)
    expect(fs.readFileSync('src/telas/Entrar.tsx', 'utf8')).not.toMatch(/Navbar/)
  })
})

describe('barra do rodapé: item aceso', () => {
  const casos: [Tela, string | null][] = [
    [{ t: 'painel' }, 'inicio'],
    [{ t: 'receitas' }, 'receitas'],
    [{ t: 'ler', m: 'ebook', p: 3 }, 'receitas'],
    [{ t: 'sos' }, 'sos'],
    [{ t: 'ler', m: 'fichas-socorro', p: 2 }, 'sos'],
    [{ t: 'oferta', p: 'encomenda', origem: 'painel' }, 'selecao'],
    [{ t: 'videoaulas' }, 'selecao'],
    [{ t: 'ler', m: 'b03', p: 1 }, null],
    [{ t: 'etiquetas' }, null],
    [{ t: 'aulas' }, null],
  ]
  it.each(casos)('%j → %s', (tela, esperado) => {
    expect(abaAtiva(tela)).toBe(esperado)
    const h = html(tela)
    const acesos = [...h.matchAll(/class="nb-item on[^"]*"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
    expect(acesos.length).toBe(esperado ? 1 : 0)
    if (esperado === 'inicio') expect(acesos[0]).toBe('Início')
    expect(h.match(/aria-current="page"/g)?.length ?? 0).toBe(esperado ? 1 : 0)
  })
  it('Início é o primeiro item, com a casinha', () => {
    expect(html({ t: 'oferta', p: 'recheios', origem: 'painel' })).toMatch(/<nav class="navbar"[^>]*><button[^>]*aria-label="Início"><span class="nb-ico" aria-hidden="true">🏠/)
  })
})

describe('barra do rodapé: bolinha da Seleção especial', () => {
  const bolinha = (h: string) => /<b class="nb-bolinha">(\d+)<\/b>/.exec(h)?.[1] ?? null
  it('conta as ofertas da Seleção especial que ela ainda não comprou', () => {
    const so = euCom(['kit'])
    const n = contagemSelecao(so)
    expect(n).toBe(ofertasSelecao(so).length)
    expect(n).toBeGreaterThan(1)
    expect(ofertasSelecao(so)).toContain('videoaulas')
    expect(bolinha(html({ t: 'painel' }, so))).toBe(String(n))
  })
  it('o número cai a cada compra', () => {
    const lista = ofertasSelecao(euCom(['kit']))
    const comprados: ProdutoId[] = ['kit']
    let antes = lista.length
    for (const p of lista) {
      comprados.push(p)
      const eu = euCom([...comprados])
      expect(contagemSelecao(eu), `depois de ${p}`).toBe(antes - 1)
      antes -= 1
    }
  })
  it('0 = sem bolinha (comprou tudo)', () => {
    const eu = euCom(['kit', ...ofertasSelecao(euCom(['kit']))])
    expect(contagemSelecao(eu)).toBe(0)
    const h = html({ t: 'painel' }, eu)
    expect(h).toContain('aria-label="Seleção especial"')
    expect(bolinha(h)).toBeNull()
    expect(h).not.toContain('nb-bolinha')
  })
  it('a Seleção especial do Início tem o id para onde a barra rola', async () => {
    const fs = await import('node:fs')
    expect(fs.readFileSync('src/telas/Painel.tsx', 'utf8')).toMatch(/className="card extras-card" id=\{ID_SELECAO\}/)
  })
})

describe('barra do rodapé: não cobre nada', () => {
  it('as telas ganham espaço embaixo e a barra respeita a safe-area', async () => {
    const fs = await import('node:fs')
    const css = fs.readFileSync('src/estilo.css', 'utf8')
    expect(css).toMatch(/body\.com-navbar #app\{padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom,0px\)\)\}/)
    expect(css).toMatch(/\.navbar\{[^}]*padding:[^}]*calc\(6px \+ env\(safe-area-inset-bottom,0px\)\)/)
  })
})
