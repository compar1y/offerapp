// Onboarding obrigatório SEM perguntas e SEM escolher confeiteira (Levi, 10/11): boas-vindas → nome → Início.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Eu } from '../src/api'
import { CtxReact, type Ctx, type Tela } from '../src/ctx'
import { AVATAR_PADRAO, emOnboarding, PASSOS_ONBOARDING, temPerfil, telaInicial } from '../src/onboarding'
import { Boas, Nome } from '../src/telas/Onboarding'
import { mostrarNavbar, Navbar } from '../src/telas/Navbar'

const semPerfil = { apelido: '', perfil: null }
const comPerfil = { apelido: 'Cida', perfil: null }

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
  it('sem perfil (sem nome): cai nas boas-vindas', () => {
    expect(temPerfil(semPerfil)).toBe(false)
    expect(telaInicial(semPerfil)).toEqual({ t: 'boas' })
    expect(telaInicial({ apelido: null as unknown as string, perfil: null })).toEqual({ t: 'boas' })
    expect(telaInicial({ apelido: '   ', perfil: null })).toEqual({ t: 'boas' })
  })
  it('sem perfil, mesmo com o Início guardado na aba (perfil zerado): não pula o onboarding', () => {
    expect(telaInicial(semPerfil, { t: 'painel' })).toEqual({ t: 'boas' })
    expect(telaInicial(semPerfil, { t: 'oferta', p: 'recheios', origem: 'painel' })).toEqual({ t: 'boas' })
  })
  it('recarregando no meio: continua no passo em que estava', () => {
    expect(telaInicial(semPerfil, { t: 'nome' })).toEqual({ t: 'nome' })
  })
  it('com o nome e sem confeiteira escolhida: já tem perfil (a confeiteira não é mais pedida)', () => {
    expect(temPerfil({ apelido: 'Cida', perfil: null })).toBe(true)
  })
  it('com perfil: direto no Início (ou na tela em que estava, nunca no onboarding)', () => {
    expect(temPerfil(comPerfil)).toBe(true)
    expect(telaInicial(comPerfil)).toEqual({ t: 'painel' })
    expect(telaInicial(comPerfil, { t: 'boas' })).toEqual({ t: 'painel' })
    expect(telaInicial(comPerfil, { t: 'receitas' })).toEqual({ t: 'receitas' })
    // quem respondeu as perguntas antigas também já tem perfil
    expect(temPerfil({ apelido: '', perfil: 'iniciante' })).toBe(true)
  })
})

describe('o caminho: boas-vindas → nome → Início, sem perguntas e sem confeiteira', () => {
  const src = readFileSync('src/telas/Onboarding.tsx', 'utf8')
  const corpo = (nome: string) => src.slice(src.indexOf(`export function ${nome}()`), src.indexOf('\nexport function', src.indexOf(`export function ${nome}()`) + 10) >>> 0 || undefined)
  it('os 2 passos, nesta ordem', () => {
    expect([...PASSOS_ONBOARDING]).toEqual(['boas', 'nome'])
  })
  it('boas-vindas leva ao nome, sem falar de perguntas', () => {
    expect(corpo('Boas')).toContain("ir({ t: 'nome' })")
    const h = render(Boas)
    expect(h).toContain('Seu acesso está liberado!')
    expect(h).toContain('Passo 1 de 2')
    expect(h.toLowerCase()).not.toContain('confeiteira')
    expect(h.toLowerCase()).not.toContain('pergunta')
  })
  it('nome: campo do apelido, Passo 2 de 2 e "Entrar na minha cozinha" → Início, gravando a confeiteira padrão', () => {
    expect(corpo('Nome')).toContain("trocar({ t: 'painel' })")
    expect(corpo('Nome')).toContain('avatar: eu.avatar ?? AVATAR_PADRAO')
    expect(AVATAR_PADRAO).toBe(0)
    const h = render(Nome)
    expect(h).toContain('id="apelido"')
    expect(h).toContain('Como você quer ser chamada?')
    expect(h).toContain('Passo 2 de 2')
    expect(h).toContain('>Entrar na minha cozinha</button>')
    expect(h).not.toContain('Continuar')
  })
  it('nome vazio não avança: botão desligado, aviso e seguir sai sem gravar', () => {
    expect(corpo('Nome')).toContain('if (!nome) return')
    expect(corpo('Nome')).not.toContain("'Confeiteira'")
    const h = render(Nome)
    expect(h).toMatch(/disabled=""[^>]*>Entrar na minha cozinha<\/button>/)
    expect(h).toContain('Escreva o seu nome para continuar.')
  })
  it('nenhuma tela pede para escolher confeiteira/avatar', () => {
    expect(src).not.toMatch(/export function Avatar|escolha a sua confeiteira|AVATARES/)
    expect(readFileSync('src/App.tsx', 'utf8')).not.toMatch(/<Avatar|'avatar'/)
    expect(readFileSync('src/ctx.ts', 'utf8')).not.toMatch(/t: 'avatar'/)
  })
  it('nenhum passo leva a Pergunta ou Resultado', () => {
    for (const n of ['Boas', 'Nome']) expect(corpo(n)).not.toMatch(/'pergunta'|'resultado'/)
  })
  it('o App usa a tela inicial do onboarding e mostra a tela do nome', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain('telaInicial(d, salva?.t ? salva : null)')
    expect(app).toContain("case 'nome': return <Nome />")
  })
})

describe('durante o onboarding: sem popup, sem aviso de instalar, sem barra', () => {
  it('barra do rodapé escondida nos 2 passos', () => {
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
