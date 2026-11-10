// WhatsApp de suporte oficial (Levi, 10/11): +55 11 94192-6165, com a mensagem pronta, em todo lugar de ajuda/suporte.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LINK_SUPORTE, MENSAGEM_SUPORTE, WHATSAPP_SUPORTE } from '../shared/catalogo'
import { Suporte } from '../src/telas/Entrar'

const ESPERADO = 'https://wa.me/5511941926165?text=' + encodeURIComponent('Oi! Comprei o Kit Fábrica de Panetones e preciso de ajuda.')

describe('WhatsApp de suporte', () => {
  it('número oficial e mensagem pronta, codificada', () => {
    expect(WHATSAPP_SUPORTE).toBe('5511941926165')
    expect(MENSAGEM_SUPORTE).toBe('Oi! Comprei o Kit Fábrica de Panetones e preciso de ajuda.')
    expect(LINK_SUPORTE).toBe(ESPERADO)
    expect(LINK_SUPORTE).toBe('https://wa.me/5511941926165?text=Oi!%20Comprei%20o%20Kit%20F%C3%A1brica%20de%20Panetones%20e%20preciso%20de%20ajuda.')
  })
  it('o botão abre esse link em outra aba', () => {
    const h = renderToStaticMarkup(createElement(Suporte))
    expect(h).toContain(`href="${ESPERADO.replace(/&/g, '&amp;')}"`)
    expect(h).toContain('target="_blank"')
    expect(h).toContain('Falar com o suporte no WhatsApp')
  })
  it('está no login, no Início e na tela de erro de acesso', () => {
    expect(readFileSync('src/telas/Entrar.tsx', 'utf8')).toMatch(/Não achou seu acesso\?<\/p>\s*<Suporte \/>/)
    expect(readFileSync('src/telas/Painel.tsx', 'utf8')).toMatch(/Precisa de ajuda\?<\/p>\s*<Suporte \/>/)
    expect(readFileSync('src/App.tsx', 'utf8')).toMatch(/Tentar de novo<\/button>\s*<Suporte \/>/)
  })
  it('nenhum outro número ou link de WhatsApp de suporte no app', () => {
    const arquivos = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(`${d}/${e.name}`) : /\.(tsx?|html)$/.test(e.name) ? [`${d}/${e.name}`] : []))
    for (const f of [...arquivos('src'), ...arquivos('shared'), ...arquivos('server'), ...arquivos('api'), 'index.html']) {
      const t = readFileSync(f, 'utf8')
      for (const m of t.matchAll(/wa\.me\/(\d+)/g)) expect(`${f}: ${m[1]}`).toBe(`${f}: 5511941926165`)
      if (f !== 'shared/catalogo.ts') expect(t, f).not.toMatch(/wa\.me\/\$\{/)
    }
    expect(readFileSync('shared/catalogo.ts', 'utf8')).not.toMatch(/WHATSAPP_SUPORTE = ''/)
  })
})
