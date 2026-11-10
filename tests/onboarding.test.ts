// Onboarding obrigatório SEM perguntas (Levi, 10/11): boas-vindas → nome → confeiteira → Início.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Eu } from '../src/api'
import { CtxReact, type Ctx, type Tela } from '../src/ctx'
import { emOnboarding, PASSOS_ONBOARDING, temPerfil, telaInicial } from '../src/onboarding'
import { Avatar, Boas, Nome } from '../src/telas/Onboarding'
import { mostrarNavbar, Navbar } from '../src/telas/Navbar'

const semPerfil = { apelido: '', avatar: null, perfil: null }
const comPerfil = { apelido: 'Cida', avatar: 2, perfil: null }

const euDe = (p: Partial<Eu>): Eu =>
  ({
    email: 'm@x.com', perfil: null, respostas: null, avatar: null, apelido: '', estado: null, ...p,
    acesso: { produtos: ['kit'], pendentes: [], materiais: ['ebook'], ganhaPresente: false, desconto: null, popup: null, ofertasDesconto: {}, agora: new Date().toISOString() },
  }) as unknown as Eu

/** renderiza uma tela com um contexto falso e guarda para onde cada botão mandaria */
function render(comp: (p: never) => unknown, eu = euDe(semPerfil), tela: Tela = { t: 'boas' }) {
  const nada = () => {}
  const ctx = { eu, estado: {}, ir: nada, trocar: nada, voltar: nada, mudar: nada, salvarPerfil: nada, toast: nada, evento: nada, recarregar: nada, sair: nada } as unknown as Ctx
  return renderToStaticMarkup(createElement(CtxReact.Provider, { value: ctx }, createElement(comp as never, { tela, popupAberto: false } as never)))
}

describe('quem passa pelo onboarding', () => {
  it('sem perfil (sem nome nem confeiteira): cai nas boas-vindas', () => {
    expect(temPerfil(semPerfil)).toBe(false)
    expect(telaInicial(semPerfil)).toEqual({ t: 'boas' })
    expect(telaInicial({ apelido: null as unknown as string, avatar: null, perfil: null })).toEqual({ t: 'boas' })
  })
  it('sem perfil, mesmo com o Início guardado na aba (perfil zerado): não pula o onboarding', () => {
    expect(telaInicial(semPerfil, { t: 'painel' })).toEqual({ t: 'boas' })
    expect(telaInicial(semPerfil, { t: 'oferta', p: 'recheios', origem: 'painel' })).toEqual({ t: 'boas' })
  })
  it('recarregando no meio: continua no passo em que estava', () => {
    expect(telaInicial(semPerfil, { t: 'nome' })).toEqual({ t: 'nome' })
    expect(telaInicial({ apelido: 'Cida', avatar: null, perfil: null }, { t: 'avatar' })).toEqual({ t: 'avatar' })
  })
  it('só o nome, sem confeiteira: ainda não tem perfil', () => {
    expect(temPerfil({ apelido: 'Cida', avatar: null, perfil: null })).toBe(false)
  })
  it('com perfil: direto no Início (ou na tela em que estava, nunca no onboarding)', () => {
    expect(temPerfil(comPerfil)).toBe(true)
    expect(telaInicial(comPerfil)).toEqual({ t: 'painel' })
    expect(telaInicial(comPerfil, { t: 'boas' })).toEqual({ t: 'painel' })
    expect(telaInicial(comPerfil, { t: 'receitas' })).toEqual({ t: 'receitas' })
    // quem respondeu as perguntas antigas também já tem perfil
    expect(temPerfil({ apelido: '', avatar: null, perfil: 'iniciante' })).toBe(true)
  })
})

describe('o caminho: boas-vindas → nome → confeiteira → Início, sem perguntas', () => {
  const src = readFileSync('src/telas/Onboarding.tsx', 'utf8')
  const corpo = (nome: string) => src.slice(src.indexOf(`export function ${nome}()`), src.indexOf('\nexport function', src.indexOf(`export function ${nome}()`) + 10) >>> 0 || undefined)
  it('os 3 passos, nesta ordem', () => {
    expect([...PASSOS_ONBOARDING]).toEqual(['boas', 'nome', 'avatar'])
  })
  it('boas-vindas leva ao nome, sem falar de perguntas', () => {
    expect(corpo('Boas')).toContain("ir({ t: 'nome' })")
    const h = render(Boas)
    expect(h).toContain('Seu acesso está liberado!')
    expect(h).toContain('Passo 1 de 3')
    expect(h.toLowerCase()).not.toContain('pergunta')
  })
  it('nome: campo do apelido e Continuar → confeiteira', () => {
    expect(corpo('Nome')).toContain("ir({ t: 'avatar' })")
    const h = render(Nome)
    expect(h).toContain('id="apelido"')
    expect(h).toContain('Como você quer ser chamada?')
    expect(h).toContain('Passo 2 de 3')
  })
  it('confeiteira: 6 opções e Entrar → Início', () => {
    expect(corpo('Avatar')).toContain("trocar({ t: 'painel' })")
    const h = render(Avatar, euDe({ apelido: 'Cida' }))
    expect(h.match(/class="av /g)?.length).toBe(6)
    expect(h).toContain('Cida, escolha a sua confeiteira')
    expect(h).toContain('Passo 3 de 3')
    expect(h).not.toContain('id="apelido"')
  })
  it('nenhum passo leva a Pergunta ou Resultado', () => {
    for (const n of ['Boas', 'Nome', 'Avatar']) expect(corpo(n)).not.toMatch(/'pergunta'|'resultado'/)
  })
  it('o App usa a tela inicial do onboarding e mostra a tela do nome', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain('telaInicial(d, salva?.t ? salva : null)')
    expect(app).toContain("case 'nome': return <Nome />")
  })
})

describe('durante o onboarding: sem popup, sem aviso de instalar, sem barra', () => {
  it('barra do rodapé escondida nos 3 passos', () => {
    for (const t of PASSOS_ONBOARDING) {
      expect(emOnboarding({ t } as Tela)).toBe(true)
      expect(mostrarNavbar({ t } as Tela, false)).toBe(false)
      expect(render(Navbar, euDe(semPerfil), { t } as Tela)).toBe('')
    }
    expect(render(Navbar, euDe(comPerfil), { t: 'painel' })).toContain('<nav class="navbar"')
  })
  it('popup de desconto: não abre nem aparece no onboarding (confere de novo ao chegar no Início)', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toMatch(/if \(!eu \|\| noOnboarding\) return\s+const r = conferirPopup\(eu\)/)
    expect(app).toContain('}, [eu, noOnboarding])')
    expect(app).toContain('{popup && !noOnboarding && <PopupDesconto')
    expect(emOnboarding({ t: 'painel' })).toBe(false)
  })
  it('aviso de instalar: só existe no Início, nunca nas telas do onboarding', () => {
    expect(readFileSync('src/telas/Painel.tsx', 'utf8')).toContain('<Instalar />')
    expect(readFileSync('src/telas/Onboarding.tsx', 'utf8')).not.toMatch(/Instalar/)
    expect(readFileSync('src/App.tsx', 'utf8')).not.toMatch(/Instalar/)
  })
})
