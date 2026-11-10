// Respostas com a Conta Feita: ela preenche UMA encomenda e o app monta as 5 respostas do bônus 04 (mensagens 07, 18, 19, 20 e 23/24)
// já preenchidas e com a conta feita. Tudo aqui é puro (sem tela) para ser testado. Nada vai para o servidor.
// Versão mínima (final.md de 10/11): até 3 itens, taxa única, "parte agora" só em reais, uma encomenda por vez,
// sem histórico, sem recibo, sem desconto, sem porcentagem, sem banco e sem QR.

export interface ItemEncomenda {
  produto: string
  /** quantidade, como ela digitou */
  qtd: string
  /** preço por unidade em reais, como ela digitou ("45" ou "45,50") */
  preco: string
}

export type Recebimento = 'entrega' | 'retirada'
/** "uma parte agora", "tudo antes" ou "tudo na entrega/retirada" */
export type FormaPagamento = 'parte' | 'antes' | 'depois'

export interface Encomenda {
  cliente: string
  itens: ItemEncomenda[]
  recebimento: Recebimento
  /** taxa de entrega em reais (só vale na entrega) */
  taxa: string
  data: string
  horario: string
  local: string
  forma: FormaPagamento
  /** em "uma parte agora": o valor que ela escolheu pedir agora */
  parte: string
  /** total acumulado que ela conferiu que já recebeu (mesmo que tenha vindo em mais de um pagamento) */
  recebido: string
}

/** guardados só no celular dela, uma vez só */
export interface MeusDados { nome: string; pix: string }

export const MAX_ITENS = 3
export const ITEM_VAZIO: ItemEncomenda = { produto: '', qtd: '', preco: '' }
export const ENCOMENDA_VAZIA: Encomenda = {
  cliente: '', itens: [{ ...ITEM_VAZIO }], recebimento: 'entrega', taxa: '', data: '', horario: '', local: '', forma: 'parte', parte: '', recebido: '',
}
export const MEUS_VAZIOS: MeusDados = { nome: '', pix: '' }

/** a encomenda de exemplo da página de venda (marcada como "Exemplo" na tela) */
export const EXEMPLO_ENCOMENDA: Encomenda = {
  cliente: 'Dona Marta',
  itens: [{ produto: 'Panetone de frutas', qtd: '2', preco: '45' }, { produto: 'Chocotone', qtd: '1', preco: '50' }],
  recebimento: 'entrega',
  taxa: '10',
  data: '20/12',
  horario: '10h',
  local: 'Rua das Flores, 120',
  forma: 'parte',
  parte: '50',
  recebido: '',
}
export const EXEMPLO_MEUS: MeusDados = { nome: 'Cida', pix: '' }

// ---------- dinheiro ----------

/** "45", "45,5", "45,50", "R$ 1.234,56", "45.50" → centavos. Vazio → 0. Inválido ou negativo → null. */
export function centavos(txt: string): number | null {
  let s = txt.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!s) return 0
  if (s.startsWith('-')) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // 1.234 = mil duzentos e trinta e quatro
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const [int, dec = ''] = s.split('.')
  return Number(int) * 100 + Number(dec.padEnd(2, '0'))
}

/** sempre com centavos: R$ 45,00 · R$ 1.234,56 */
export function brl(c: number): string {
  const neg = c < 0
  const v = Math.abs(Math.round(c))
  const int = String(Math.floor(v / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}R$ ${int},${String(v % 100).padStart(2, '0')}`
}

/** quantidade: inteiro de 1 a 999. Vazio → 0. Inválido → null. */
export function quantidade(txt: string): number | null {
  const s = txt.trim()
  if (!s) return 0
  if (!/^\d{1,3}$/.test(s)) return null
  return Number(s)
}

// ---------- contas ----------

export interface LinhaConta { produto: string; qtd: number; unit: number; subtotal: number }

export interface Conta {
  /** problemas que impedem as respostas, na ordem em que ela deve resolver */
  erros: string[]
  linhas: LinhaConta[]
  produtos: number
  taxa: number
  total: number
  recebido: number
  /** o que falta receber (total − recebido) */
  falta: number
  /** quanto pedir AGORA no pedido de pagamento (0 = não há o que pedir agora) */
  pedirAgora: number
  /** valor da "parte agora" que ela escolheu */
  parte: number
}

const limpo = (s: string) => s.trim().replace(/\s+/g, ' ')

/** faz as contas da encomenda. Item totalmente vazio é ignorado; item pela metade vira erro. */
export function calcular(e: Encomenda): Conta {
  const erros: string[] = []
  const linhas: LinhaConta[] = []
  e.itens.slice(0, MAX_ITENS).forEach((it, i) => {
    const nome = limpo(it.produto)
    const q = quantidade(it.qtd)
    const u = centavos(it.preco)
    if (!nome && !it.qtd.trim() && !it.preco.trim()) return
    const n = e.itens.length > 1 ? ` do item ${i + 1}` : ''
    if (!nome) erros.push(`Escreva o produto${n}.`)
    if (q === null || q === 0) erros.push(`Confira a quantidade${n}: use um número inteiro, como 2.`)
    if (u === null) erros.push(`Confira o preço por unidade${n}: use só números, como 45 ou 45,50.`)
    else if (u === 0) erros.push(`Falta o preço por unidade${n}.`)
    if (nome && q && u) linhas.push({ produto: nome, qtd: q, unit: u, subtotal: q * u })
  })
  if (!linhas.length && !erros.length) erros.push('Preencha pelo menos um item: produto, quantidade e preço por unidade.')
  const taxaTxt = centavos(e.taxa)
  if (e.recebimento === 'entrega' && taxaTxt === null) erros.push('Confira a taxa de entrega: use só números, como 10 ou 10,50.')
  const taxa = e.recebimento === 'entrega' ? taxaTxt ?? 0 : 0
  const recebidoTxt = centavos(e.recebido)
  if (recebidoTxt === null) erros.push('Confira o valor que você já recebeu: use só números, como 50.')
  const recebido = recebidoTxt ?? 0
  const parteTxt = centavos(e.parte)
  if (e.forma === 'parte' && parteTxt === null) erros.push('Confira o valor da parte agora: use só números, como 50.')
  const parte = e.forma === 'parte' ? parteTxt ?? 0 : 0
  const produtos = linhas.reduce((s, l) => s + l.subtotal, 0)
  const total = produtos + taxa
  if (linhas.length && recebido > total) erros.push(`O valor recebido (${brl(recebido)}) passou do total (${brl(total)}). Confira antes de responder.`)
  const falta = Math.max(0, total - recebido)
  let pedirAgora = 0
  if (e.forma === 'antes') pedirAgora = falta
  else if (e.forma === 'parte') pedirAgora = Math.max(0, parte - recebido)
  return { erros, linhas, produtos, taxa, total, recebido, falta, pedirAgora, parte }
}

// ---------- respostas ----------

export type IdResposta = 'orcamento' | 'pagamento' | 'confirmacao' | 'falta' | 'lembrete'
export interface Resposta {
  id: IdResposta
  titulo: string
  /** de que mensagem do bônus 04 ela vem */
  base: string
  /** texto pronto para copiar; null quando ainda não pode sair */
  texto: string | null
  /** por que não saiu (o que preencher ou revisar) */
  aviso: string | null
}

const quando = (e: Encomenda) => {
  const d = limpo(e.data)
  const h = limpo(e.horario)
  if (d && h) return `${d}, às ${h}`
  return d || (h ? `às ${h}` : '')
}

/** "R$ 50,00 agora e o restante na entrega" / "tudo antes" / "tudo na retirada" */
export function condicao(e: Encomenda, c: Conta): string {
  const onde = e.recebimento === 'entrega' ? 'na entrega' : 'na retirada'
  if (e.forma === 'antes') return 'pagamento total antes'
  if (e.forma === 'depois') return `pagamento total ${onde}`
  return `${brl(c.parte)} agora e o restante ${onde}`
}

/** quando o que falta será pago: ", na entrega" · " (R$ 50,00 agora e o restante na entrega)" · "" (tudo antes) */
function faltaQuando(e: Encomenda, c: Conta): string {
  const onde = e.recebimento === 'entrega' ? 'na entrega' : 'na retirada'
  if (e.forma === 'antes') return ''
  if (e.forma === 'parte' && c.pedirAgora > 0 && c.pedirAgora < c.falta) return ` (${brl(c.pedirAgora)} agora e o restante ${onde})`
  return `, ${onde}`
}

const linhaItem = (l: LinhaConta) => `${l.qtd} × ${l.produto}: ${brl(l.unit)} cada = ${brl(l.subtotal)}`
const assinatura = (m: MeusDados) => (limpo(m.nome) ? `\n\n${limpo(m.nome)}` : '')
const pix = (m: MeusDados) => (limpo(m.pix) ? `\nChave PIX: ${limpo(m.pix)}` : '')

/** mensagem 07 do bônus 04 (orçamento individual), com a conta feita */
function orcamento(e: Encomenda, c: Conta, m: MeusDados): string {
  const l: string[] = [`${limpo(e.cliente)}, seu orçamento ficou assim:`, '']
  c.linhas.forEach((x) => l.push(linhaItem(x)))
  if (c.linhas.length > 1 || c.taxa) l.push(`Produtos: ${brl(c.produtos)}`)
  if (e.recebimento === 'entrega') l.push(c.taxa ? `Entrega: ${brl(c.taxa)}` : 'Recebimento: entrega')
  else l.push('Recebimento: retirada')
  l.push(`Total: ${brl(c.total)}`)
  l.push(`Pagamento: ${condicao(e, c)}`)
  const q = quando(e)
  if (q) l.push(`Data e horário propostos: ${q}`)
  if (limpo(e.local)) l.push(`${e.recebimento === 'entrega' ? 'Endereço' : 'Local'}: ${limpo(e.local)}`)
  l.push('', 'Posso seguir com essa opção?')
  return l.join('\n') + assinatura(m)
}

/** mensagem 18 (instrução de pagamento) */
function pagamento(e: Encomenda, c: Conta, m: MeusDados): string {
  const l = [`Oi, ${limpo(e.cliente)}! Para seguir com o pedido, a condição combinada é ${condicao(e, c)}.`, `Valor a pagar nesta etapa: ${brl(c.pedirAgora)}${pix(m)}`]
  if (c.recebido > 0) l.splice(1, 0, `Já recebi ${brl(c.recebido)}.`)
  l.push('', 'Após o envio, vou conferir o recebimento e te retornar com a confirmação.')
  return l.join('\n') + assinatura(m)
}

/** mensagem 19 (confirmação conferida): usa só o valor que ELA digitou como recebido */
function confirmacao(e: Encomenda, c: Conta, m: MeusDados): string {
  const l: string[] = [`Tudo conferido, ${limpo(e.cliente)}. Seu pedido está confirmado!`, '']
  c.linhas.forEach((x) => l.push(`${x.qtd} × ${x.produto}`))
  l.push(`Total: ${brl(c.total)}`)
  l.push(`Valor recebido: ${brl(c.recebido)}`)
  l.push(c.falta ? `Falta: ${brl(c.falta)}${faltaQuando(e, c)}` : 'Falta: R$ 0,00')
  const q = quando(e)
  const rec = e.recebimento === 'entrega' ? 'Entrega' : 'Retirada'
  const partes = [q && `em ${q}`, limpo(e.local) && `${e.recebimento === 'entrega' ? 'no endereço' : 'no local'}: ${limpo(e.local)}`].filter(Boolean)
  l.push(partes.length ? `${rec} ${partes.join(', ')}.` : `${rec} combinada.`)
  l.push('', 'Se precisar conversar sobre algum detalhe, me avise por aqui.')
  return l.join('\n') + assinatura(m)
}

/** mensagem 20 (condição pendente): o que falta pagar, a partir do que ela disse que já recebeu */
function faltaPagar(e: Encomenda, c: Conta, m: MeusDados): string {
  const l = [`Oi, ${limpo(e.cliente)}! Passando para lembrar que, do seu pedido de ${brl(c.total)}, ${c.recebido ? `já recebi ${brl(c.recebido)} e ` : ''}ainda falta ${brl(c.falta)}.`]
  const onde = e.recebimento === 'entrega' ? 'na entrega' : 'na retirada'
  if (e.forma === 'parte' && c.pedirAgora > 0 && c.pedirAgora < c.falta) l.push(`Combinamos ${brl(c.pedirAgora)} agora e o restante ${onde}.`)
  else if (e.forma !== 'antes') l.push(`Combinamos esse valor ${onde}.`)
  if (limpo(m.pix)) l.push(`Se preferir adiantar, a chave PIX é ${limpo(m.pix)}.`)
  l.push('', 'Você consegue me retornar para eu atualizar o registro?')
  return l.join('\n') + assinatura(m)
}

/** mensagens 23 (lembrete de retirada) e 24 (combinação de entrega) */
function lembrete(e: Encomenda, c: Conta, m: MeusDados): string {
  const q = quando(e)
  const l: string[] = []
  if (e.recebimento === 'retirada') {
    l.push(`Oi, ${limpo(e.cliente)}! Lembrando da retirada do seu pedido em ${q}.`)
    if (limpo(e.local)) l.push(`Local: ${limpo(e.local)}`)
  } else {
    l.push(`Oi, ${limpo(e.cliente)}! Lembrando da entrega do seu pedido em ${q}.`)
    if (limpo(e.local)) l.push(`Endereço: ${limpo(e.local)}`)
  }
  if (c.falta) l.push(`Falta acertar ${brl(c.falta)}${faltaQuando(e, c)}.`)
  l.push('', e.recebimento === 'retirada' ? 'Se perceber que não vai conseguir chegar no horário, me avise para combinarmos o recebimento.' : 'Se precisar mudar algo, me avise por aqui.')
  return l.join('\n') + assinatura(m)
}

/** as 5 respostas, cada uma liberada só quando tem o que precisa; nenhuma cobra quando não há valor devido */
export function respostas(e: Encomenda, m: MeusDados): Resposta[] {
  const c = calcular(e)
  const semCliente = !limpo(e.cliente) ? 'Escreva o nome da cliente.' : null
  const bloqueio = semCliente ?? (c.erros.length ? c.erros[0] : null)
  const r = (id: IdResposta, titulo: string, base: string, montar: () => string, aviso: string | null): Resposta =>
    ({ id, titulo, base, texto: bloqueio || aviso ? null : montar(), aviso: bloqueio ?? aviso })

  let avisoPag: string | null = null
  if (e.forma === 'depois') avisoPag = 'Você escolheu receber tudo na entrega ou na retirada: não há valor para pedir agora.'
  else if (e.forma === 'parte' && c.parte === 0) avisoPag = 'Escreva o valor da parte que você vai pedir agora.'
  else if (e.forma === 'parte' && c.parte > c.total) avisoPag = `A parte agora (${brl(c.parte)}) passou do total (${brl(c.total)}). Confira o valor.`
  else if (c.pedirAgora === 0) avisoPag = e.forma === 'parte' ? 'A parte combinada já foi recebida. Use o lembrete do que falta pagar.' : 'Não falta nada para receber.'

  const semData = !limpo(e.data) ? `Escreva a data da ${e.recebimento} para liberar este lembrete.` : null
  return [
    r('orcamento', 'Orçamento', 'mensagem 07 do bônus 04', () => orcamento(e, c, m), e.forma === 'parte' && c.parte > c.total ? `A parte agora (${brl(c.parte)}) passou do total (${brl(c.total)}). Confira o valor.` : e.forma === 'parte' && c.parte === 0 ? 'Escreva o valor da parte que você vai pedir agora.' : null),
    r('pagamento', 'Pedido de pagamento', 'mensagem 18 do bônus 04', () => pagamento(e, c, m), avisoPag),
    r('confirmacao', 'Confirmação do combinado', 'mensagem 19 do bônus 04', () => confirmacao(e, c, m), null),
    r('falta', 'Lembrete do que falta pagar', 'mensagem 20 do bônus 04', () => faltaPagar(e, c, m), c.falta === 0 ? 'Não falta nada para receber.' : null),
    r('lembrete', `Lembrete da ${e.recebimento}`, e.recebimento === 'retirada' ? 'mensagem 23 do bônus 04' : 'mensagem 24 do bônus 04', () => lembrete(e, c, m), semData),
  ]
}
