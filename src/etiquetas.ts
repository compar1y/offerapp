// Imagens e Etiquetas com o Seu Nome: as peças são desenhadas aqui, no celular dela, com o nome e o WhatsApp que ela digitou.
// Nada vai para o servidor. 6 imagens (3 Status 9:16 e 3 quadradas) em PNG e um PDF A4 com etiquetas e cartões, com linhas de corte.
// Visual do app: Natal discreto, tons quentes (creme, vermelho fita, verde pinheiro, dourado), letra cursiva para o nome.

export interface DadosEtiquetas {
  nome: string
  whatsapp: string
  sabores: string
  /** "Pedidos até": texto livre, ex. "20/12" */
  ate: string
  /** como ela entrega, ex. "Entrego no bairro ou você retira aqui" */
  entrega: string
  /** quais peças levam o WhatsApp (por id) */
  semWhats: string[]
}

export const DADOS_VAZIOS: DadosEtiquetas = { nome: '', whatsapp: '', sabores: '', ate: '', entrega: '', semWhats: ['obrigada', 'cartao-presente'] }

export const EXEMPLO: DadosEtiquetas = {
  nome: 'Panetones da Dona Cida',
  whatsapp: '11987654321',
  sabores: 'Frutas cristalizadas\nGotas de chocolate\nDoce de leite\nTrufado de chocolate',
  ate: '20/12',
  entrega: 'Entrego no bairro ou você retira aqui em casa',
  semWhats: ['obrigada', 'cartao-presente'],
}

export type IdImagem = 'abertas' | 'ate' | 'obrigada' | 'sabores' | 'entrega' | 'presentes'
export interface Imagem { id: IdImagem; titulo: string; formato: 'status' | 'quadrada' }
export const IMAGENS: Imagem[] = [
  { id: 'abertas', titulo: 'Encomendas abertas', formato: 'status' },
  { id: 'ate', titulo: 'Pedidos até o dia', formato: 'status' },
  { id: 'obrigada', titulo: 'Obrigada pela encomenda', formato: 'status' },
  { id: 'sabores', titulo: 'Sabores', formato: 'quadrada' },
  { id: 'entrega', titulo: 'Entrega ou retirada', formato: 'quadrada' },
  { id: 'presentes', titulo: 'Presentes para empresa ou família', formato: 'quadrada' },
]

const COR = {
  creme: '#FBF3E6',
  creme2: '#F3E3C8',
  papel: '#FFFDF8',
  fita: '#B3261E',
  fitaEscura: '#7E1712',
  pinheiro: '#1F5D45',
  pinheiroEscuro: '#123D2D',
  dourado: '#C8962E',
  chocolate: '#3B2416',
  chocolate2: '#6B4A35',
  massa: '#E0A54B',
  massaEscura: '#B97A2A',
}
const DISPLAY = '"Baloo 2", "Trebuchet MS", sans-serif'
const TEXTO = '"Nunito Sans", system-ui, sans-serif'
const CURSIVA = '"Dancing Script", "Brush Script MT", cursive'

/** espera as fontes do app (e a cursiva) chegarem antes de desenhar; sem internet, desenha com a reserva */
export async function carregarFontes(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const pedidos = ['800 40px "Baloo 2"', '700 40px "Baloo 2"', '400 40px "Nunito Sans"', '800 40px "Nunito Sans"', '700 40px "Dancing Script"']
  await Promise.race([Promise.all(pedidos.map((f) => document.fonts.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 3000))])
}

/** (11) 98765-4321 */
export function formatarWhats(s: string): string {
  const d = s.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return s.trim()
}

export const listaSabores = (s: string): string[] =>
  s.split(/\n|;|,/).map((x) => x.trim()).filter(Boolean).slice(0, 6)

/** nome do arquivo sem acento nem espaço */
export const nomeArquivo = (base: string, nome: string, ext: string) => {
  const limpo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40)
  return `${base}${limpo ? `-${limpo}` : ''}.${ext}`
}

// ---------- desenho ----------

type Ctx = CanvasRenderingContext2D

/** quebra o texto em até `linhas` linhas que caibam na largura, diminuindo a letra se precisar */
function caber(c: Ctx, texto: string, fonte: (px: number) => string, largura: number, max: number, min: number, linhas: number): { px: number; partes: string[] } {
  const palavras = texto.trim().split(/\s+/).filter(Boolean)
  for (let px = max; px >= min; px -= 2) {
    c.font = fonte(px)
    const partes: string[] = []
    let atual = ''
    let ok = true
    for (const p of palavras) {
      const tenta = atual ? `${atual} ${p}` : p
      if (c.measureText(tenta).width <= largura) atual = tenta
      else {
        if (atual) partes.push(atual)
        atual = p
        if (c.measureText(p).width > largura) ok = false
      }
    }
    if (atual) partes.push(atual)
    if (ok && partes.length <= linhas) return { px, partes }
  }
  // não coube nem na menor: corta com reticências na última linha
  c.font = fonte(min)
  const partes: string[] = []
  let atual = ''
  for (const p of palavras) {
    const tenta = atual ? `${atual} ${p}` : p
    if (c.measureText(tenta).width <= largura) atual = tenta
    else { partes.push(atual || p); atual = atual ? p : '' }
  }
  if (atual) partes.push(atual)
  const r = partes.slice(0, linhas)
  if (partes.length > linhas) {
    let u = r[linhas - 1]
    while (u.length > 1 && c.measureText(`${u}…`).width > largura) u = u.slice(0, -1)
    r[linhas - 1] = `${u}…`
  }
  return { px: min, partes: r }
}

/** escreve centralizado em x; devolve o y depois do bloco */
function bloco(c: Ctx, texto: string, x: number, y: number, o: { fonte: (px: number) => string; largura: number; max: number; min?: number; linhas?: number; cor: string; entre?: number }): number {
  if (!texto.trim()) return y
  const { px, partes } = caber(c, texto, o.fonte, o.largura, o.max, o.min ?? Math.round(o.max * 0.5), o.linhas ?? 2)
  c.fillStyle = o.cor
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.font = o.fonte(px)
  const alt = px * (o.entre ?? 1.12)
  partes.forEach((p, i) => c.fillText(p, x, y + px + i * alt))
  return y + px + (partes.length - 1) * alt + px * 0.3
}

const display = (peso = 800) => (px: number) => `${peso} ${px}px ${DISPLAY}`
const texto = (peso = 600) => (px: number) => `${peso} ${px}px ${TEXTO}`
const cursiva = (px: number) => `700 ${px}px ${CURSIVA}`

function estrela(c: Ctx, x: number, y: number, r: number, cor: string) {
  c.save()
  c.fillStyle = cor
  c.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.38 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
  c.restore()
}

/** pontinhos e estrelinhas douradas espalhados, sempre no mesmo lugar (semente fixa) */
function confete(c: Ctx, w: number, h: number, n: number, seed = 7) {
  let s = seed
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    if (r() > 0.7) estrela(c, x, y, 6 + r() * 10, 'rgba(200,150,46,.55)')
    else {
      c.fillStyle = 'rgba(200,150,46,.35)'
      c.beginPath()
      c.arc(x, y, 2 + r() * 4, 0, Math.PI * 2)
      c.fill()
    }
  }
}

/** ramo de pinheiro com bolinhas, no canto */
function ramo(c: Ctx, x: number, y: number, esc: number, espelho = false) {
  c.save()
  c.translate(x, y)
  c.scale(espelho ? -esc : esc, esc)
  c.strokeStyle = COR.pinheiroEscuro
  c.lineWidth = 6
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(0, 0)
  c.quadraticCurveTo(90, 40, 200, 30)
  c.stroke()
  for (let i = 0; i < 11; i++) {
    const t = i / 10
    const px = 200 * t
    const py = 40 * t * (1 - t) * 1.6 + 30 * t
    c.strokeStyle = i % 2 ? COR.pinheiro : COR.pinheiroEscuro
    c.lineWidth = 7
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + 26, py - 34); c.stroke()
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + 28, py + 30); c.stroke()
  }
  for (const [bx, by, cor] of [[70, 52, COR.fita], [118, 6, COR.dourado], [150, 64, COR.fita]] as const) {
    c.fillStyle = cor
    c.beginPath(); c.arc(bx, by, 15, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,.45)'
    c.beginPath(); c.arc(bx - 5, by - 5, 5, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

/** panetone desenhado (cúpula dourada, forminha de papel com listras, fita e laço) */
function panetone(c: Ctx, cx: number, base: number, larg: number) {
  const h = larg * 0.62
  const topo = base - h
  c.save()
  // sombra
  c.fillStyle = 'rgba(59,36,22,.12)'
  c.beginPath(); c.ellipse(cx, base + larg * 0.03, larg * 0.56, larg * 0.07, 0, 0, Math.PI * 2); c.fill()
  // cúpula
  const g = c.createLinearGradient(0, topo - larg * 0.28, 0, topo + larg * 0.2)
  g.addColorStop(0, '#8A4B1C'); g.addColorStop(0.55, COR.massaEscura); g.addColorStop(1, COR.massa)
  c.fillStyle = g
  c.beginPath()
  c.moveTo(cx - larg * 0.52, topo + larg * 0.12)
  c.bezierCurveTo(cx - larg * 0.5, topo - larg * 0.34, cx + larg * 0.5, topo - larg * 0.34, cx + larg * 0.52, topo + larg * 0.12)
  c.closePath(); c.fill()
  // gotinhas/frutas na cúpula
  for (const [dx, dy, cor] of [[-0.25, -0.05, COR.fita], [0.05, -0.15, COR.pinheiro], [0.27, -0.02, COR.fita], [-0.06, 0.02, '#3B2416'], [0.16, -0.11, '#3B2416']] as const) {
    c.fillStyle = cor
    c.beginPath(); c.ellipse(cx + dx * larg, topo + dy * larg, larg * 0.028, larg * 0.02, 0.4, 0, Math.PI * 2); c.fill()
  }
  // forminha
  c.fillStyle = '#F6E7CF'
  c.beginPath()
  c.moveTo(cx - larg * 0.5, topo + larg * 0.1)
  c.lineTo(cx + larg * 0.5, topo + larg * 0.1)
  c.lineTo(cx + larg * 0.46, base)
  c.lineTo(cx - larg * 0.46, base)
  c.closePath(); c.fill()
  c.save(); c.clip()
  c.strokeStyle = 'rgba(179,38,30,.85)'
  c.lineWidth = larg * 0.045
  for (let i = -6; i <= 6; i++) {
    c.beginPath(); c.moveTo(cx + i * larg * 0.11, topo); c.lineTo(cx + i * larg * 0.11 + larg * 0.2, base + 10); c.stroke()
  }
  c.restore()
  // fita
  c.fillStyle = COR.pinheiro
  c.fillRect(cx - larg * 0.49, topo + larg * 0.24, larg * 0.98, larg * 0.08)
  // laço
  c.fillStyle = COR.pinheiroEscuro
  c.beginPath(); c.ellipse(cx - larg * 0.09, topo + larg * 0.24, larg * 0.1, larg * 0.06, -0.5, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.ellipse(cx + larg * 0.09, topo + larg * 0.24, larg * 0.1, larg * 0.06, 0.5, 0, Math.PI * 2); c.fill()
  c.fillStyle = COR.pinheiro
  c.beginPath(); c.arc(cx, topo + larg * 0.26, larg * 0.04, 0, Math.PI * 2); c.fill()
  c.restore()
}

function moldura(c: Ctx, w: number, h: number, m: number) {
  c.strokeStyle = COR.dourado
  c.lineWidth = 4
  c.strokeRect(m, m, w - 2 * m, h - 2 * m)
  c.lineWidth = 1.5
  c.strokeRect(m + 12, m + 12, w - 2 * m - 24, h - 2 * m - 24)
}

function fundo(c: Ctx, w: number, h: number) {
  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, COR.creme)
  g.addColorStop(1, COR.creme2)
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  confete(c, w, h, Math.round((w * h) / 26000))
}

/** faixa com o nome dela: assinatura da peça */
function assinatura(c: Ctx, d: DadosEtiquetas, x: number, y: number, larg: number, max: number, cor = COR.fitaEscura): number {
  if (!d.nome.trim()) return y
  return bloco(c, d.nome, x, y, { fonte: cursiva, largura: larg, max, min: Math.round(max * 0.45), linhas: 2, cor, entre: 1.05 })
}

function whats(c: Ctx, d: DadosEtiquetas, id: string, x: number, y: number, larg: number, px: number): number {
  const n = formatarWhats(d.whatsapp)
  if (!n || d.semWhats.includes(id)) return y
  // pílula verde com o número
  c.font = texto(800)(px)
  const t = `WhatsApp ${n}`
  const tw = Math.min(c.measureText(t).width, larg - px * 2)
  const pw = tw + px * 1.6
  const ph = px * 1.9
  c.fillStyle = COR.pinheiro
  const rx = x - pw / 2
  c.beginPath()
  c.roundRect(rx, y, pw, ph, ph / 2)
  c.fill()
  bloco(c, t, x, y + (ph - px) / 2 - px * 0.12, { fonte: texto(800), largura: tw + 2, max: px, min: Math.round(px * 0.7), linhas: 1, cor: '#fff' })
  return y + ph
}

/** desenha uma das 6 imagens no canvas (1080×1920 ou 1080×1080) */
export function desenharImagem(canvas: HTMLCanvasElement, id: IdImagem, d: DadosEtiquetas) {
  const img = IMAGENS.find((i) => i.id === id)!
  const w = 1080
  const h = img.formato === 'status' ? 1920 : 1080
  canvas.width = w
  canvas.height = h
  const c = canvas.getContext('2d')!
  fundo(c, w, h)
  moldura(c, w, h, 36)
  const L = w - 200
  const cx = w / 2
  const sabores = listaSabores(d.sabores)

  if (img.formato === 'status') {
    ramo(c, 70, 130, 1.2)
    ramo(c, w - 70, 130, 1.2, true)
    let y = 250
    if (id === 'abertas') {
      y = bloco(c, 'ENCOMENDAS DE NATAL', cx, y, { fonte: display(800), largura: L, max: 84, cor: COR.pinheiro, linhas: 1 })
      y = bloco(c, 'abertas!', cx, y + 10, { fonte: cursiva, largura: L, max: 150, cor: COR.fita, linhas: 1 })
      panetone(c, cx, y + 520, 560)
      y += 600
      y = bloco(c, 'Panetone caseiro, feito à mão com carinho para a sua mesa de Natal.', cx, y, { fonte: texto(600), largura: L - 40, max: 54, linhas: 3, cor: COR.chocolate })
      y = bloco(c, 'Reserve o seu!', cx, y + 16, { fonte: display(800), largura: L, max: 60, cor: COR.fita, linhas: 1 })
      y = assinatura(c, d, cx, y + 30, L, 122)
      whats(c, d, id, cx, Math.min(y + 40, h - 190), L, 50)
    } else if (id === 'ate') {
      y = bloco(c, 'Pedidos de Natal', cx, y, { fonte: display(800), largura: L, max: 96, cor: COR.pinheiro, linhas: 1 })
      y = bloco(c, 'até', cx, y + 30, { fonte: cursiva, largura: L, max: 120, cor: COR.fita, linhas: 1 })
      // selo redondo com a data
      const r = 230
      const sy = y + 40 + r
      c.fillStyle = COR.fita
      c.beginPath(); c.arc(cx, sy, r, 0, Math.PI * 2); c.fill()
      c.strokeStyle = COR.dourado; c.lineWidth = 8
      c.beginPath(); c.arc(cx, sy, r - 22, 0, Math.PI * 2); c.stroke()
      bloco(c, d.ate.trim() || '__/12', cx, sy - 95, { fonte: display(800), largura: r * 1.55, max: 150, min: 60, linhas: 1, cor: '#fff' })
      y = sy + r + 50
      y = bloco(c, 'Depois disso, só se sobrar forno. Garanta o seu panetone fresquinho para a ceia.', cx, y, { fonte: texto(600), largura: L - 40, max: 54, linhas: 3, cor: COR.chocolate })
      y = assinatura(c, d, cx, y + 40, L, 122)
      whats(c, d, id, cx, Math.min(y + 40, h - 190), L, 50)
    } else {
      y = bloco(c, 'Obrigada', cx, y + 20, { fonte: cursiva, largura: L, max: 190, cor: COR.fita, linhas: 1 })
      y = bloco(c, 'PELA SUA ENCOMENDA', cx, y + 10, { fonte: display(800), largura: L, max: 76, cor: COR.pinheiro, linhas: 1 })
      panetone(c, cx, y + 560, 600)
      y += 640
      y = bloco(c, 'Que o seu Natal seja doce, quentinho e cheio de gente querida em volta da mesa.', cx, y, { fonte: texto(600), largura: L - 40, max: 54, linhas: 3, cor: COR.chocolate })
      y = bloco(c, 'Feliz Natal!', cx, y + 16, { fonte: display(800), largura: L, max: 60, cor: COR.dourado, linhas: 1 })
      y = assinatura(c, d, cx, y + 30, L, 122)
      whats(c, d, id, cx, Math.min(y + 40, h - 190), L, 50)
    }
    return
  }

  // quadradas
  ramo(c, 60, 95, 0.95)
  ramo(c, w - 60, 95, 0.95, true)
  let y = 150
  if (id === 'sabores') {
    y = bloco(c, 'Sabores de Natal', cx, y, { fonte: cursiva, largura: L, max: 110, cor: COR.fita, linhas: 1 })
    const lista = sabores.length ? sabores : ['Sabor 1', 'Sabor 2', 'Sabor 3']
    const px = lista.length > 4 ? 42 : 48
    y += 30
    for (const s of lista) {
      estrela(c, 190, y + px * 0.62, 16, COR.dourado)
      c.textAlign = 'left'
      const r = caber(c, s, texto(800), L - 200, px, 28, 1)
      c.font = texto(800)(r.px); c.fillStyle = COR.chocolate
      c.fillText(r.partes[0] ?? '', 230, y + px)
      y += px * 1.55
    }
    y = assinatura(c, d, cx, Math.max(y + 10, 720), L, 82)
    whats(c, d, id, cx, Math.min(Math.max(y + 20, 880), h - 140), L, 38)
  } else if (id === 'entrega') {
    y = bloco(c, 'Entrega ou retirada', cx, y, { fonte: display(800), largura: L, max: 74, cor: COR.pinheiro, linhas: 1 })
    panetone(c, cx, y + 300, 330)
    y += 340
    y = bloco(c, d.entrega.trim() || 'Combine comigo o melhor jeito de receber o seu panetone.', cx, y, { fonte: texto(700), largura: L - 40, max: 50, linhas: 3, cor: COR.chocolate })
    y = assinatura(c, d, cx, y + 20, L, 82)
    whats(c, d, id, cx, Math.min(y + 25, h - 140), L, 38)
  } else {
    y = bloco(c, 'Presente que encanta', cx, y, { fonte: cursiva, largura: L, max: 104, cor: COR.fita, linhas: 1 })
    y = bloco(c, 'PARA A FAMÍLIA E PARA A EMPRESA', cx, y + 10, { fonte: display(800), largura: L, max: 46, cor: COR.pinheiro, linhas: 1 })
    panetone(c, cx - 150, y + 290, 250)
    panetone(c, cx + 150, y + 290, 250)
    y += 330
    y = bloco(c, 'Panetones feitos à mão, embalados para presentear. Encomende já os seus.', cx, y, { fonte: texto(700), largura: L - 40, max: 42, linhas: 2, cor: COR.chocolate })
    y = assinatura(c, d, cx, y + 15, L, 80)
    whats(c, d, id, cx, Math.min(y + 25, h - 140), L, 38)
  }
}

// ---------- PDF A4 de etiquetas e cartões ----------

export const A4 = { w: 1240, h: 1754 } // 150 dpi
const MM = 1240 / 210

function linhaDeCorte(c: Ctx, x1: number, y1: number, x2: number, y2: number) {
  c.save()
  c.strokeStyle = '#9A8A7A'
  c.lineWidth = 1.5
  c.setLineDash([10, 8])
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
  c.restore()
}

/** grade com linhas de corte; chama `cel` para cada célula */
function grade(c: Ctx, cols: number, rows: number, margem: number, cel: (x: number, y: number, w: number, h: number, i: number) => void) {
  const w = (A4.w - 2 * margem) / cols
  const h = (A4.h - 2 * margem - 60) / rows
  const y0 = margem + 60
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) cel(margem + k * w, y0 + r * h, w, h, r * cols + k)
  for (let k = 0; k <= cols; k++) linhaDeCorte(c, margem + k * w, y0 - 20, margem + k * w, y0 + rows * h + 20)
  for (let r = 0; r <= rows; r++) linhaDeCorte(c, margem - 20, y0 + r * h, A4.w - margem + 20, y0 + r * h)
}

function cabecalho(c: Ctx, t: string) {
  c.fillStyle = '#fff'
  c.fillRect(0, 0, A4.w, A4.h)
  c.fillStyle = '#7A6A5A'
  c.font = texto(600)(20)
  c.textAlign = 'center'
  c.fillText(`${t}  ·  ✂ corte nas linhas tracejadas  ·  imprima em A4, tamanho real (100%)`, A4.w / 2, 50)
}

function etiqueta(c: Ctx, d: DadosEtiquetas, x: number, y: number, w: number, h: number, pb: boolean, embranco: boolean) {
  const p = 22
  const cor = (cc: string) => (pb ? '#222' : cc)
  c.save()
  c.fillStyle = pb ? '#fff' : COR.papel
  c.beginPath(); c.roundRect(x + p, y + p, w - 2 * p, h - 2 * p, 24); c.fill()
  c.strokeStyle = cor(COR.dourado); c.lineWidth = 3
  c.beginPath(); c.roundRect(x + p + 8, y + p + 8, w - 2 * p - 16, h - 2 * p - 16, 18); c.stroke()
  estrela(c, x + p + 40, y + p + 40, 14, cor(COR.fita))
  estrela(c, x + w - p - 40, y + p + 40, 14, cor(COR.fita))
  const cx = x + w / 2
  let yy = y + p + 26
  yy = bloco(c, 'Feito à mão por', cx, yy, { fonte: display(700), largura: w - 140, max: 30, cor: cor(COR.pinheiro), linhas: 1 })
  if (!embranco && d.nome.trim()) yy = bloco(c, d.nome, cx, yy + 2, { fonte: cursiva, largura: w - 90, max: 56, min: 26, linhas: 2, cor: cor(COR.fitaEscura), entre: 1 })
  else {
    linhaDeCorte(c, cx - (w - 160) / 2, yy + 50, cx + (w - 160) / 2, yy + 50)
    yy += 62
  }
  // sabor
  const ys = y + h - p - 58
  c.fillStyle = cor(COR.chocolate)
  c.font = texto(800)(24)
  c.textAlign = 'left'
  c.fillText('Sabor:', x + p + 34, ys)
  c.strokeStyle = cor('#8A7A6A'); c.lineWidth = 2
  c.beginPath(); c.moveTo(x + p + 120, ys + 4); c.lineTo(x + w - p - 34, ys + 4); c.stroke()
  c.restore()
}

function cartao(c: Ctx, d: DadosEtiquetas, x: number, y: number, w: number, h: number, tipo: 'presente' | 'obrigada', pb: boolean, embranco: boolean) {
  const p = 26
  const cor = (cc: string) => (pb ? '#222' : cc)
  c.save()
  c.fillStyle = pb ? '#fff' : COR.creme
  c.fillRect(x + p, y + p, w - 2 * p, h - 2 * p)
  if (!pb) { c.save(); c.beginPath(); c.rect(x + p, y + p, w - 2 * p, h - 2 * p); c.clip(); c.translate(x, y); confete(c, w, h, 30, Math.round(x + y)); c.restore() }
  c.strokeStyle = cor(COR.dourado); c.lineWidth = 3
  c.strokeRect(x + p + 12, y + p + 12, w - 2 * p - 24, h - 2 * p - 24)
  const cx = x + w / 2
  if (!pb) { estrela(c, x + p + 44, y + p + 44, 16, COR.fita); estrela(c, x + w - p - 44, y + p + 44, 16, COR.fita) }
  let yy = y + p + 70
  if (tipo === 'presente') {
    yy = bloco(c, 'Um presente', cx, yy, { fonte: cursiva, largura: w - 140, max: 72, cor: cor(COR.fita), linhas: 1 })
    yy = bloco(c, 'FEITO À MÃO PARA VOCÊ', cx, yy + 4, { fonte: display(800), largura: w - 140, max: 30, cor: cor(COR.pinheiro), linhas: 1 })
    yy += 40
    c.fillStyle = cor(COR.chocolate); c.font = texto(800)(28); c.textAlign = 'left'
    for (const rot of ['Para:', 'De:']) {
      c.fillText(rot, x + p + 60, yy + 28)
      c.strokeStyle = cor('#8A7A6A'); c.lineWidth = 2
      c.beginPath(); c.moveTo(x + p + 140, yy + 32); c.lineTo(x + w - p - 60, yy + 32); c.stroke()
      yy += 70
    }
    yy = bloco(c, 'Feliz Natal!', cx, yy + 10, { fonte: display(800), largura: w - 140, max: 40, cor: cor(COR.dourado), linhas: 1 })
  } else {
    yy = bloco(c, 'Obrigada!', cx, yy, { fonte: cursiva, largura: w - 140, max: 86, cor: cor(COR.fita), linhas: 1 })
    yy = bloco(c, 'Fiz este panetone com todo carinho. Que ele adoce o seu Natal.', cx, yy + 10, { fonte: texto(600), largura: w - 170, max: 30, linhas: 3, cor: cor(COR.chocolate) })
  }
  // assinatura embaixo
  const yb = y + h - p - 200
  if (!embranco && d.nome.trim()) {
    const fim = bloco(c, d.nome, cx, yb, { fonte: cursiva, largura: w - 150, max: 52, min: 26, linhas: 2, cor: cor(COR.fitaEscura), entre: 1 })
    const n = formatarWhats(d.whatsapp)
    if (n && !d.semWhats.includes(`cartao-${tipo}`)) bloco(c, `WhatsApp ${n}`, cx, fim + 4, { fonte: texto(800), largura: w - 150, max: 24, linhas: 1, cor: cor(COR.pinheiro) })
  } else {
    linhaDeCorte(c, cx - (w - 200) / 2, yb + 60, cx + (w - 200) / 2, yb + 60)
  }
  c.restore()
}

export interface PaginaPdf { titulo: string; desenhar(c: Ctx, d: DadosEtiquetas): void }

export const PAGINAS_PDF: PaginaPdf[] = [
  { titulo: 'Etiquetas coloridas', desenhar: (c, d) => { cabecalho(c, 'Etiquetas coloridas'); grade(c, 2, 5, 14 * MM, (x, y, w, h) => etiqueta(c, d, x, y, w, h, false, false)) } },
  { titulo: 'Etiquetas em preto e branco', desenhar: (c, d) => { cabecalho(c, 'Etiquetas em preto e branco'); grade(c, 2, 5, 14 * MM, (x, y, w, h) => etiqueta(c, d, x, y, w, h, true, false)) } },
  { titulo: 'Cartões de presente e de agradecimento', desenhar: (c, d) => { cabecalho(c, 'Cartões de presente e de agradecimento'); grade(c, 2, 2, 14 * MM, (x, y, w, h, i) => cartao(c, d, x, y, w, h, i < 2 ? 'presente' : 'obrigada', false, false)) } },
  { titulo: 'Cartões em preto e branco', desenhar: (c, d) => { cabecalho(c, 'Cartões em preto e branco'); grade(c, 2, 2, 14 * MM, (x, y, w, h, i) => cartao(c, d, x, y, w, h, i < 2 ? 'presente' : 'obrigada', true, false)) } },
  { titulo: 'Etiquetas em branco para escrever à mão', desenhar: (c, d) => { cabecalho(c, 'Etiquetas em branco para escrever à mão'); grade(c, 2, 5, 14 * MM, (x, y, w, h) => etiqueta(c, d, x, y, w, h, true, true)) } },
  { titulo: 'Cartões em branco para escrever à mão', desenhar: (c, d) => { cabecalho(c, 'Cartões em branco para escrever à mão'); grade(c, 2, 2, 14 * MM, (x, y, w, h, i) => cartao(c, d, x, y, w, h, i < 2 ? 'presente' : 'obrigada', true, true)) } },
]

// ---------- arquivos ----------

const blobDe = (cv: HTMLCanvasElement, tipo: string, q?: number) =>
  new Promise<Blob>((ok, erro) => cv.toBlob((b) => (b ? ok(b) : erro(new Error('canvas vazio'))), tipo, q))

export async function imagemPng(id: IdImagem, d: DadosEtiquetas): Promise<Blob> {
  const cv = document.createElement('canvas')
  desenharImagem(cv, id, d)
  return blobDe(cv, 'image/png')
}

/** PDF mínimo: uma imagem JPEG por página A4 (595×842 pt). Sem biblioteca. */
export function montarPdf(jpegs: Uint8Array[]): Blob {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const offsets: number[] = []
  let tam = 0
  const add = (x: string | Uint8Array) => {
    const b = typeof x === 'string' ? enc.encode(x) : x
    partes.push(b)
    tam += b.length
  }
  const obj = (n: number, corpo: () => void) => {
    offsets[n] = tam
    add(`${n} 0 obj\n`)
    corpo()
    add('\nendobj\n')
  }
  const n = jpegs.length
  // 1 catálogo, 2 páginas, depois por página: página, imagem, conteúdo
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'))
  const kids = jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  obj(2, () => add(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`))
  jpegs.forEach((jpg, i) => {
    const p = 3 + i * 3
    const conteudo = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q'
    obj(p, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`))
    obj(p + 1, () => {
      add(`<< /Type /XObject /Subtype /Image /Width ${A4.w} /Height ${A4.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`)
      add(jpg)
      add('\nendstream')
    })
    obj(p + 2, () => add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`))
  })
  const total = 3 + n * 3
  const xref = tam
  add(`xref\n0 ${total}\n0000000000 65535 f \n`)
  for (let i = 1; i < total; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  add(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

export async function pdfEtiquetas(d: DadosEtiquetas): Promise<Blob> {
  const jpegs: Uint8Array[] = []
  for (const p of PAGINAS_PDF) {
    const cv = document.createElement('canvas')
    cv.width = A4.w
    cv.height = A4.h
    p.desenhar(cv.getContext('2d')!, d)
    jpegs.push(new Uint8Array(await (await blobDe(cv, 'image/jpeg', 0.9)).arrayBuffer()))
  }
  return montarPdf(jpegs)
}
