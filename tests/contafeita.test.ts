// Respostas com a Conta Feita: venda ligada pela chave CONTAFEITA_VENDA_LIGADA, nada liberado além da ferramenta, contas em centavos e as regras do final.md.
import { describe, expect, it, vi } from 'vitest'
import { CONTAFEITA_VENDA_LIGADA, CONTAFEITA_WIAPY, PRODUTOS, materiaisLiberados, vendaLigada } from '../shared/catalogo'
import { ARQUIVOS, podeBaixar, podeVerAulasCom } from '../shared/acesso'
import { OFERTAS } from '../shared/conteudo'
import { lerPedido, produtoDoCheckout } from '../server/wiapy'
import { ofertaDisponivel, tem } from '../src/ctx'
import {
  ENCOMENDA_VAZIA, EXEMPLO_ENCOMENDA, EXEMPLO_MEUS, MEUS_VAZIOS, brl, calcular, centavos, quantidade, respostas, type Encomenda,
} from '../src/contafeita'

const eu = (produtos: string[]) => ({ acesso: { produtos, pendentes: [], materiais: [] } }) as never
const enc = (x: Partial<Encomenda>): Encomenda => ({ ...ENCOMENDA_VAZIA, cliente: 'Dona Marta', ...x })
const resp = (e: Encomenda, id: string, m = MEUS_VAZIOS) => respostas(e, m).find((r) => r.id === id)!

describe('produto Respostas com a Conta Feita', () => {
  it('no catálogo a R$9,90, sem liberar PDF nem aulas', () => {
    expect(PRODUTOS.contafeita).toMatchObject({ id: 'contafeita', nome: 'Respostas com a Conta Feita', precoCentavos: 990, libera: [] })
    expect(materiaisLiberados(['contafeita'])).toEqual([])
    for (const a of ARQUIVOS) expect(podeBaixar(['contafeita'], a)).toBe(false)
    expect(podeVerAulasCom(['contafeita'], 'venda')).toBe(false)
    expect(OFERTAS.contafeita.botao).toBe('Quero minhas respostas prontas')
  })
  it('IDs da Wiapy preenchidos e a chave CONTAFEITA_VENDA_LIGADA ligada', () => {
    expect(CONTAFEITA_WIAPY).toEqual({
      checkoutUrl: 'https://pay.wiapy.com/6af2a90804a3ce9b119ec3a8',
      checkoutIds: ['6af2a90804a3ce9b119ec3a8'],
      produtoIds: ['6af2a8a304a3ce9b119ebf8d'],
    })
    expect(PRODUTOS.contafeita.checkoutUrl).toBe('https://pay.wiapy.com/6af2a90804a3ce9b119ec3a8')
    expect(CONTAFEITA_VENDA_LIGADA).toBe(true)
  })
  it('chave ligada: o card e a oferta aparecem para quem não comprou e somem para quem comprou', () => {
    expect(vendaLigada('contafeita', true)).toBe(true)
    expect(ofertaDisponivel(eu(['kit']), 'contafeita')).toBe(true)
    expect(ofertaDisponivel(eu(['kit', 'contafeita']), 'contafeita')).toBe(false)
  })
  it('chave desligada: nada da venda aparece para quem não comprou, e quem comprou continua com a ferramenta', async () => {
    expect(vendaLigada('contafeita', false)).toBe(false)
    expect(vendaLigada('etiquetas', false)).toBe(true)
    vi.resetModules()
    vi.doMock('../shared/catalogo', async (orig) => {
      const m = await orig<typeof import('../shared/catalogo')>()
      return { ...m, CONTAFEITA_VENDA_LIGADA: false, vendaLigada: (p: string, l = false) => m.vendaLigada(p as never, l) }
    })
    const ctx = await import('../src/ctx')
    expect(ctx.ofertaDisponivel(eu(['kit']), 'contafeita')).toBe(false)
    expect(ctx.ofertaDisponivel(eu([]), 'contafeita')).toBe(false)
    expect(ctx.ofertaDisponivel(eu(['kit']), 'etiquetas')).toBe(true)
    expect(ctx.tem(eu(['kit', 'contafeita']), 'contafeita')).toBe(true)
    vi.doUnmock('../shared/catalogo')
    vi.resetModules()
  })
  it('a ferramenta só abre para quem tem "contafeita"', () => {
    expect(tem(eu(['kit', 'recheios', 'encomenda', 'primeira', 'videoaulas', 'etiquetas']), 'contafeita')).toBe(false)
    expect(tem(eu(['contafeita']), 'contafeita')).toBe(true)
  })
  it('webhook: o conteúdo e o checkout da Wiapy viram "contafeita"; ids estranhos não', () => {
    expect(produtoDoCheckout('6af2a90804a3ce9b119ec3a8')).toBe('contafeita')
    expect(produtoDoCheckout('')).toBeNull()
    const pago = (checkout: string, produto: string) => ({ customer: { email: 'c@x.com' }, checkout: { id: checkout, amount: 990 }, payment: { id: 'p', status: 'paid', amount: 990, payment_method: 'pix' }, products: [{ id: produto, title: 'Respostas com a Conta Feita' }] })
    expect(lerPedido(pago('6af2a90804a3ce9b119ec3a8', '6af2a8a304a3ce9b119ebf8d') as never).produtos).toEqual(['contafeita'])
    expect(lerPedido(pago('outro', '6af2a8a304a3ce9b119ebf8d') as never).produtos).toEqual(['contafeita'])
    expect(lerPedido(pago('6af2a90804a3ce9b119ec3a8', 'desconhecido') as never).produtos).toEqual(['contafeita'])
    expect(lerPedido(pago('qualquer', 'qualquer') as never).produtos).not.toContain('contafeita')
  })
  it('copy: transparente sobre os textos do kit, sem número de ganho nem escassez', () => {
    const o = OFERTAS.contafeita
    const tudo = [o.gancho, o.sub ?? '', ...o.itens, o.garantia].join(' ')
    expect(tudo).toMatch(/bônus 04/)
    expect(tudo).toMatch(/kit/)
    expect(tudo).not.toMatch(/R\$\s*\d|últimas|só hoje|vagas|ganhe|lucr/i)
  })
})

describe('dinheiro e quantidade', () => {
  it('lê reais do jeito que ela digita e escreve sempre com centavos', () => {
    expect(centavos('45')).toBe(4500)
    expect(centavos('45,5')).toBe(4550)
    expect(centavos('45,50')).toBe(4550)
    expect(centavos('R$ 1.234,56')).toBe(123456)
    expect(centavos('1.234')).toBe(123400)
    expect(centavos('45.50')).toBe(4550)
    expect(centavos('')).toBe(0)
    for (const x of ['-5', 'abc', '4,555', '1,2,3']) expect(centavos(x)).toBeNull()
    expect(brl(4500)).toBe('R$ 45,00')
    expect(brl(123456)).toBe('R$ 1.234,56')
    expect(brl(5)).toBe('R$ 0,05')
  })
  it('quantidade: inteiro positivo', () => {
    expect(quantidade('2')).toBe(2)
    expect(quantidade('')).toBe(0)
    for (const x of ['1,5', '-1', 'dois', '1000']) expect(quantidade(x)).toBeNull()
  })
})

describe('contas', () => {
  it('o exemplo da Dona Marta: 2 panetones de frutas a R$45, 1 chocotone a R$50, entrega R$10, parte agora R$50', () => {
    const c = calcular(EXEMPLO_ENCOMENDA)
    expect(c.erros).toEqual([])
    expect(c.produtos).toBe(14000)
    expect(c.taxa).toBe(1000)
    expect(c.total).toBe(15000)
    expect(c.pedirAgora).toBe(5000)
    expect(c.falta).toBe(15000)
  })
  it('centavos sem erro de arredondamento', () => {
    const c = calcular(enc({ itens: [{ produto: 'Panetone', qtd: '3', preco: '33,33' }, { produto: 'Mini', qtd: '7', preco: '0,10' }], taxa: '0,01', recebido: '10,01' }))
    expect(c.total).toBe(9999 + 70 + 1)
    expect(c.falta).toBe(10070 - 1001)
  })
  it('a taxa só entra na entrega', () => {
    expect(calcular(enc({ itens: [{ produto: 'P', qtd: '1', preco: '40' }], recebimento: 'retirada', taxa: '10' })).total).toBe(4000)
  })
  it('mudar a quantidade recalcula total e saldo, e em "parte agora" mantém o valor que ela escolheu', () => {
    const a = calcular({ ...EXEMPLO_ENCOMENDA })
    const b = calcular({ ...EXEMPLO_ENCOMENDA, itens: [{ produto: 'Panetone de frutas', qtd: '3', preco: '45' }, EXEMPLO_ENCOMENDA.itens[1]] })
    expect(b.total - a.total).toBe(4500)
    expect(b.pedirAgora).toBe(a.pedirAgora)
  })
  it('"tudo antes" pede o saldo ainda não recebido; "tudo na entrega" não pede nada agora', () => {
    const base = { itens: [{ produto: 'P', qtd: '2', preco: '50' }], recebido: '30' }
    expect(calcular(enc({ ...base, forma: 'antes' })).pedirAgora).toBe(7000)
    expect(calcular(enc({ ...base, forma: 'depois' })).pedirAgora).toBe(0)
  })
  it('pagamento parcial e pedido quitado', () => {
    const p = calcular(enc({ itens: [{ produto: 'P', qtd: '2', preco: '50' }], forma: 'parte', parte: '40', recebido: '40' }))
    expect(p.falta).toBe(6000)
    expect(p.pedirAgora).toBe(0)
    const q = calcular(enc({ itens: [{ produto: 'P', qtd: '2', preco: '50' }], recebido: '100' }))
    expect(q.falta).toBe(0)
  })
  it('validações: quantidade inválida, preço ausente, valor negativo, recebido acima do total', () => {
    expect(calcular(enc({ itens: [{ produto: 'P', qtd: '0', preco: '10' }] })).erros.join()).toMatch(/quantidade/)
    expect(calcular(enc({ itens: [{ produto: 'P', qtd: '1', preco: '' }] })).erros.join()).toMatch(/preço/)
    expect(calcular(enc({ itens: [{ produto: 'P', qtd: '1', preco: '-10' }] })).erros.join()).toMatch(/preço/)
    expect(calcular(enc({ itens: [{ produto: 'P', qtd: '1', preco: '10' }], recebido: '20' })).erros.join()).toMatch(/passou do total/)
    expect(calcular(enc({ itens: [{ produto: '', qtd: '', preco: '' }] })).erros.join()).toMatch(/pelo menos um item/)
  })
  it('no máximo 3 itens', () => {
    const it = { produto: 'P', qtd: '1', preco: '10' }
    expect(calcular(enc({ itens: [it, it, it, it] })).linhas).toHaveLength(3)
  })
})

describe('respostas', () => {
  it('o orçamento do exemplo sai pronto, com a conta feita', () => {
    const r = resp(EXEMPLO_ENCOMENDA, 'orcamento', EXEMPLO_MEUS)
    expect(r.texto).toBe([
      'Dona Marta, seu orçamento ficou assim:',
      '',
      '2 × Panetone de frutas: R$ 45,00 cada = R$ 90,00',
      '1 × Chocotone: R$ 50,00 cada = R$ 50,00',
      'Produtos: R$ 140,00',
      'Entrega: R$ 10,00',
      'Total: R$ 150,00',
      'Pagamento: R$ 50,00 agora e o restante na entrega',
      'Data e horário propostos: 20/12, às 10h',
      'Endereço: Rua das Flores, 120',
      '',
      'Posso seguir com essa opção?',
      '',
      'Cida',
    ].join('\n'))
  })
  it('as 5 respostas existem e nenhuma sai sem o nome da cliente', () => {
    const l = respostas({ ...EXEMPLO_ENCOMENDA, cliente: '  ' }, MEUS_VAZIOS)
    expect(l.map((r) => r.id)).toEqual(['orcamento', 'pagamento', 'confirmacao', 'falta', 'lembrete'])
    for (const r of l) { expect(r.texto).toBeNull(); expect(r.aviso).toMatch(/nome da cliente/) }
  })
  it('nenhuma resposta sai com item inválido ou recebido acima do total', () => {
    for (const e of [enc({ itens: [{ produto: 'P', qtd: 'x', preco: '10' }] }), enc({ itens: [{ produto: 'P', qtd: '1', preco: '10' }], recebido: '50' })])
      for (const r of respostas(e, MEUS_VAZIOS)) expect(r.texto).toBeNull()
  })
  it('pedido de pagamento: valor desta etapa e a chave PIX só se ela informou', () => {
    const sem = resp(EXEMPLO_ENCOMENDA, 'pagamento')
    expect(sem.texto).toContain('Valor a pagar nesta etapa: R$ 50,00')
    expect(sem.texto).not.toContain('PIX')
    const com = resp(EXEMPLO_ENCOMENDA, 'pagamento', { nome: '', pix: 'cida@email.com' })
    expect(com.texto).toContain('Chave PIX: cida@email.com')
  })
  it('nenhuma cobra quando não há valor devido', () => {
    const quitado = enc({ itens: [{ produto: 'P', qtd: '1', preco: '50' }], forma: 'antes', recebido: '50', data: '20/12' })
    expect(resp(quitado, 'pagamento').texto).toBeNull()
    expect(resp(quitado, 'falta').texto).toBeNull()
    expect(resp(quitado, 'lembrete').texto).not.toMatch(/Falta/)
    expect(resp(quitado, 'confirmacao').texto).toContain('Falta: R$ 0,00')
    const naEntrega = enc({ itens: [{ produto: 'P', qtd: '1', preco: '50' }], forma: 'depois' })
    expect(resp(naEntrega, 'pagamento').texto).toBeNull()
    expect(resp(naEntrega, 'pagamento').aviso).toMatch(/não há valor para pedir agora/)
  })
  it('"parte agora" acima do total pede revisão', () => {
    const e = enc({ itens: [{ produto: 'P', qtd: '1', preco: '50' }], forma: 'parte', parte: '80' })
    expect(resp(e, 'pagamento').texto).toBeNull()
    expect(resp(e, 'pagamento').aviso).toMatch(/passou do total/)
  })
  it('a confirmação usa o valor que ELA digitou e nunca diz "pago" por conta própria', () => {
    const e = { ...EXEMPLO_ENCOMENDA, recebido: '50' }
    const t = resp(e, 'confirmacao').texto!
    expect(t).toContain('Valor recebido: R$ 50,00')
    expect(t).toContain('Falta: R$ 100,00, na entrega')
    for (const r of respostas(e, EXEMPLO_MEUS)) if (r.texto) expect(r.texto).not.toMatch(/\bpago\b/i)
  })
  it('antes de receber a parte, o que falta diz quanto é agora e quanto fica para a entrega', () => {
    expect(resp(EXEMPLO_ENCOMENDA, 'confirmacao').texto).toContain('Falta: R$ 150,00 (R$ 50,00 agora e o restante na entrega)')
    expect(resp(EXEMPLO_ENCOMENDA, 'falta').texto).toContain('Combinamos R$ 50,00 agora e o restante na entrega.')
  })
  it('lembrete do que falta: a partir do que ela disse que já recebeu', () => {
    const t = resp({ ...EXEMPLO_ENCOMENDA, recebido: '50' }, 'falta').texto!
    expect(t).toContain('do seu pedido de R$ 150,00, já recebi R$ 50,00 e ainda falta R$ 100,00')
  })
  it('lembrete da entrega pede a data; campos opcionais vazios somem da mensagem', () => {
    const semData = { ...EXEMPLO_ENCOMENDA, data: '', horario: '', local: '' }
    expect(resp(semData, 'lembrete').texto).toBeNull()
    expect(resp(semData, 'lembrete').aviso).toMatch(/data da entrega/)
    const o = resp(semData, 'orcamento').texto!
    expect(o).not.toMatch(/Data e horário|Endereço|undefined|null|\[/)
    const r = resp({ ...EXEMPLO_ENCOMENDA, recebimento: 'retirada', local: 'Aqui em casa' }, 'lembrete').texto!
    expect(r).toContain('Lembrando da retirada do seu pedido em 20/12, às 10h.')
    expect(r).toContain('Local: Aqui em casa')
    expect(r).not.toContain('Entrega')
  })
  it('acentos e nomes longos passam inteiros', () => {
    const nome = 'Maria Aparecida da Conceição Gonçalves'
    const t = resp({ ...EXEMPLO_ENCOMENDA, cliente: nome, itens: [{ produto: 'Panetone de doce de leite com nozes', qtd: '1', preco: '89,90' }] }, 'orcamento').texto!
    expect(t.startsWith(`${nome}, seu orçamento`)).toBe(true)
    expect(t).toContain('1 × Panetone de doce de leite com nozes: R$ 89,90 cada = R$ 89,90')
  })
})
