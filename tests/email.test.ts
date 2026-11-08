import { describe, expect, it } from 'vitest'
import { emailLigado, enviarEmailAcesso, montarEmailAcesso } from '../server/email'

describe('e-mail de acesso', () => {
  it('fica desligado sem as variáveis e não tenta enviar', async () => {
    delete process.env.RESEND_API_KEY
    expect(emailLigado()).toBe(false)
    expect(await enviarEmailAcesso('a@b.com', ['kit'])).toEqual({ enviado: false, erro: 'desligado' })
  })
  it('lista os produtos comprados, traz o link do app e escapa o e-mail', () => {
    const m = montarEmailAcesso('maria<x>@gmail.com', ['kit', 'recheios'])
    expect(m.assunto).toContain('Fábrica de Panetones')
    expect(m.html).toContain('10 Recheios que Mais Vendem')
    expect(m.html).toContain('https://offerapp-umber.vercel.app')
    expect(m.html).toContain('maria&lt;x&gt;@gmail.com')
  })
  it('compra só de upsell tem assunto com o nome do produto', () => {
    expect(montarEmailAcesso('a@b.com', ['encomenda']).assunto).toContain('Encomenda Puxa Encomenda')
  })
})
