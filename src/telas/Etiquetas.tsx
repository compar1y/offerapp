// Entrega das "Imagens e Etiquetas com o Seu Nome": ela digita o nome e o WhatsApp, e o app gera as 6 imagens e o PDF A4.
// Só abre para quem tem o produto 'etiquetas'. As peças são desenhadas no celular dela (src/etiquetas.ts); nada vai para o servidor.
import { useEffect, useMemo, useRef, useState } from 'react'
import { PRODUTOS } from '../../shared/catalogo'
import { ofertaDisponivel, tem, useApp } from '../ctx'
import {
  DADOS_VAZIOS, EXEMPLO, IMAGENS, carregarFontes, desenharEtiquetaAvulsa, desenharImagem, formatarWhats, imagemPng, nomeArquivo, pdfEtiquetas,
  type DadosEtiquetas, type IdImagem,
} from '../etiquetas'
import { iosInstalado, podeCompartilhar, compartilhar, salvarNoCelular } from '../salvar'

const chave = (email: string) => `fornada-etiquetas:v1:${email.toLowerCase()}`
function ler(email: string): DadosEtiquetas {
  try {
    const j = JSON.parse(localStorage.getItem(chave(email)) ?? 'null') as Partial<DadosEtiquetas> | null
    return j && typeof j === 'object' ? { ...DADOS_VAZIOS, ...j, semWhats: Array.isArray(j.semWhats) ? j.semWhats : DADOS_VAZIOS.semWhats } : DADOS_VAZIOS
  } catch {
    return DADOS_VAZIOS
  }
}
function gravar(email: string, d: DadosEtiquetas) {
  try { localStorage.setItem(chave(email), JSON.stringify(d)) } catch { /* sem armazenamento: só não lembra */ }
}

export function EtiquetasTela() {
  const { eu, voltar, trocar } = useApp()
  const comprou = tem(eu, 'etiquetas')
  // quem não comprou não vê a entrega: vai para a oferta (se ela estiver no ar) ou volta
  useEffect(() => {
    if (comprou) return
    if (ofertaDisponivel(eu, 'etiquetas')) trocar({ t: 'oferta', p: 'etiquetas', origem: 'entrega' })
    else voltar()
  }, [comprou, eu, trocar, voltar])
  return comprou ? <Gerador /> : null
}

function Gerador() {
  const { eu, voltar, evento, toast } = useApp()
  const [d, setD] = useState<DadosEtiquetas>(() => ler(eu.email))
  const [prontas, setProntas] = useState<Partial<Record<IdImagem, { file: File; url: string }>>>({})
  const [fontes, setFontes] = useState(false)
  const [pdf, setPdf] = useState<File | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const ios = iosInstalado()

  useEffect(() => { carregarFontes().then(() => setFontes(true)) }, [])
  useEffect(() => { evento('etiquetas.aberta', {}) }, [evento])

  // a cada mudança (com uma pausa), guarda os dados e redesenha as 6 imagens; o PDF velho deixa de valer
  useEffect(() => {
    gravar(eu.email, d)
    setPdf(null)
    if (!fontes) return
    let vivo = true
    const t = setTimeout(async () => {
      const novas: Partial<Record<IdImagem, { file: File; url: string }>> = {}
      for (const im of IMAGENS) {
        const b = await imagemPng(im.id, d)
        novas[im.id] = { file: new File([b], nomeArquivo(`natal-${im.id}`, d.nome, 'png'), { type: 'image/png' }), url: URL.createObjectURL(b) }
      }
      if (!vivo) return Object.values(novas).forEach((x) => URL.revokeObjectURL(x!.url))
      setProntas((velhas) => { Object.values(velhas).forEach((x) => URL.revokeObjectURL(x!.url)); return novas })
    }, 450)
    return () => { vivo = false; clearTimeout(t) }
  }, [d, fontes, eu.email])

  const muda = (k: keyof DadosEtiquetas) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }))
  const alternaWhats = (id: string) => setD((x) => ({ ...x, semWhats: x.semWhats.includes(id) ? x.semWhats.filter((y) => y !== id) : [...x.semWhats, id] }))
  const temWhats = formatarWhats(d.whatsapp) !== ''

  async function salvar(f: File, onde: string) {
    const como = await salvarNoCelular(f)
    if (como) {
      evento('etiquetas.baixada', { peca: onde, como })
      if (como === 'link') toast('Salvo! Está nos downloads do celular.')
    }
  }

  async function gerarPdf() {
    setGerandoPdf(true)
    try {
      await carregarFontes()
      const b = await pdfEtiquetas(d)
      setPdf(new File([b], nomeArquivo('etiquetas-e-cartoes', d.nome, 'pdf'), { type: 'application/pdf' }))
    } catch {
      toast('Não consegui gerar o PDF agora. Tente de novo.')
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <>
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <p className="eyebrow">Seu material</p>
      <h1>{PRODUTOS.etiquetas.nome}</h1>
      <p className="sub">Escreva uma vez. Todas as peças saem na hora com os seus dados.</p>

      <div className="card form-etiquetas">
        <label>Nome do seu negócio (ou o seu nome)
          <input value={d.nome} onChange={muda('nome')} maxLength={60} placeholder="Ex.: Panetones da Dona Cida" autoComplete="organization" />
        </label>
        <label>Seu WhatsApp <small>(opcional)</small>
          <input value={d.whatsapp} onChange={muda('whatsapp')} inputMode="tel" maxLength={20} placeholder="(11) 98765-4321" autoComplete="tel" />
        </label>
        <label>Seus sabores <small>(opcional, um por linha, até 6: vão nas etiquetas e na imagem de sabores)</small>
          <textarea value={d.sabores} onChange={muda('sabores')} rows={4} maxLength={240} placeholder={'Frutas cristalizadas\nGotas de chocolate\nDoce de leite'} />
        </label>
        <label>Pedidos até o dia <small>(opcional: vai na imagem “Pedidos até”)</small>
          <input value={d.ate} onChange={muda('ate')} maxLength={12} placeholder="20/12" />
        </label>
        <label>Como você entrega <small>(opcional: vai na imagem “Entrega ou retirada”)</small>
          <input value={d.entrega} onChange={muda('entrega')} maxLength={90} placeholder="Entrego no bairro ou você retira aqui" />
        </label>
        {!d.nome.trim() && <p className="sub" style={{ fontSize: 14, margin: 0 }}>Sem nome, as peças saem sem assinatura e as etiquetas ficam com a linha para escrever à mão.</p>}
      </div>

      <h2>6 imagens para o WhatsApp</h2>
      <p className="sub">3 em pé, para o Status, e 3 quadradas, para conversa e grupo.{ios ? ' Toque em “Salvar” e escolha “Salvar imagem”.' : ''}</p>
      <div className="grade-pecas">
        {IMAGENS.map((im) => {
          const p = prontas[im.id]
          return (
            <div key={im.id} className={`peca ${im.formato}`}>
              <div className="peca-img">{p ? <img src={p.url} alt={`Imagem: ${im.titulo}`} /> : <span className="sub">Desenhando…</span>}</div>
              <b>{im.titulo}</b>
              {temWhats && (
                <label className="peca-whats"><input type="checkbox" checked={!d.semWhats.includes(im.id)} onChange={() => alternaWhats(im.id)} /> Com o WhatsApp</label>
              )}
              <button className="btn baixar" disabled={!p} onClick={() => p && salvar(p.file, im.id)}>{ios ? '💾 Salvar' : '⬇️ Baixar imagem'}</button>
              {!ios && p && podeCompartilhar(p.file) && (
                <button className="link" onClick={() => compartilhar(p.file).then((ok) => ok && evento('etiquetas.baixada', { peca: im.id, como: 'compartilhar' }))}>Enviar pelo WhatsApp</button>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>Etiquetas e cartões para imprimir</h2>
        <p className="sub">PDF em folha A4, com linhas de corte: etiquetas “Feito à mão por”, cartões de presente e de agradecimento, versão em preto e branco e um modelo em branco para escrever à mão. Imprima em casa ou na papelaria, em tamanho real (100%).</p>
        {temWhats && (
          <div className="peca-whats-lista">
            <label className="peca-whats"><input type="checkbox" checked={!d.semWhats.includes('cartao-presente')} onChange={() => alternaWhats('cartao-presente')} /> WhatsApp no cartão de presente</label>
            <label className="peca-whats"><input type="checkbox" checked={!d.semWhats.includes('cartao-obrigada')} onChange={() => alternaWhats('cartao-obrigada')} /> WhatsApp no cartão de agradecimento</label>
          </div>
        )}
        {pdf ? (
          <button className="btn baixar comprar-pulsa" onClick={() => salvar(pdf, 'pdf')}>{ios ? '💾 Salvar o PDF' : '⬇️ Baixar o PDF'}</button>
        ) : (
          <button className="btn baixar" onClick={gerarPdf} disabled={gerandoPdf || !fontes}>{gerandoPdf ? 'Preparando o PDF…' : '📄 Preparar o PDF com o meu nome'}</button>
        )}
        <p className="sub" style={{ fontSize: 13 }}>São peças de apresentação: não substituem o rótulo com ingredientes e validade.</p>
      </div>
    </>
  )
}

/** peças de exemplo ("Panetones da Dona Cida") para a vitrine e a oferta, desenhadas na hora */
export function useAmostraEtiquetas(ids: IdImagem[] = ['abertas', 'sabores', 'obrigada']): string[] {
  const [urls, setUrls] = useState<string[]>([])
  const chaveIds = ids.join(',')
  const lista = useMemo(() => chaveIds.split(',') as IdImagem[], [chaveIds])
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    carregarFontes().then(() => {
      if (!vivo.current) return
      setUrls(lista.map((id) => {
        const cv = document.createElement('canvas')
        desenharImagem(cv, id, EXEMPLO)
        return cv.toDataURL('image/jpeg', 0.82)
      }))
    })
    return () => { vivo.current = false }
  }, [lista])
  return urls
}

/** a etiqueta e o cartão de exemplo, recortados do PDF */
export function useAmostraImpressos(): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    carregarFontes().then(async () => {
      const { PAGINAS_PDF, A4 } = await import('../etiquetas')
      if (!vivo) return
      const cv = document.createElement('canvas')
      cv.width = A4.w
      cv.height = A4.h
      PAGINAS_PDF[0].desenhar(cv.getContext('2d')!, EXEMPLO)
      setUrl(cv.toDataURL('image/jpeg', 0.82))
    })
    return () => { vivo = false }
  }, [])
  return url
}

/** composição de vitrine: 2 imagens em pé, 1 quadrada e a folha de etiquetas. A foto da confeiteira entra depois. */
export function VitrineEtiquetas({ compacta }: { compacta?: boolean }) {
  const [status, quadrada, obrigada] = useAmostraEtiquetas()
  const folha = useAmostraImpressos()
  return (
    <div className={`vitrine-etiquetas${compacta ? ' compacta' : ''}`} aria-label="Exemplo das peças com o nome Panetones da Dona Cida">
      {folha && <img className="ve-folha" src={folha} alt="" />}
      {obrigada && <img className="ve-status ve-2" src={obrigada} alt="" />}
      {status && <img className="ve-status ve-1" src={status} alt="" />}
      {quadrada && <img className="ve-quadrada" src={quadrada} alt="" />}
      {!compacta && <span className="ve-nome">Exemplo com o nome “Panetones da Dona Cida”</span>}
    </div>
  )
}

/** "digite o seu nome → sai pronto": o nome de exemplo aparece letra por letra e a etiqueta se desenha junto, de verdade */
export function DigiteSaiPronto() {
  const ref = useRef<HTMLCanvasElement>(null)
  const nome = EXEMPLO.nome
  const [n, setN] = useState(0)
  const [fontes, setFontes] = useState(false)
  useEffect(() => { let vivo = true; carregarFontes().then(() => vivo && setFontes(true)); return () => { vivo = false } }, [])
  useEffect(() => {
    if (!fontes) return
    let parado = false
    try { parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* sem matchMedia */ }
    if (parado) { setN(nome.length); return }
    // digita, segura o resultado pronto por 3 s e recomeça
    const t = setInterval(() => setN((x) => (x >= nome.length + 30 ? 0 : x + 1)), 100)
    return () => clearInterval(t)
  }, [fontes, nome])
  const digitado = nome.slice(0, Math.min(n, nome.length))
  useEffect(() => {
    if (ref.current && fontes) desenharEtiquetaAvulsa(ref.current, { ...EXEMPLO, nome: digitado, sabores: 'Frutas cristalizadas' })
  }, [digitado, fontes])
  return (
    <div className="digite-pronto" aria-label="Exemplo: você digita o nome do seu negócio e a etiqueta sai pronta">
      <div className="dp-passo"><b>1</b> Você digita</div>
      <div className="dp-campo" aria-hidden="true">
        <small>Nome do seu negócio</small>
        <span>{digitado}<i className="dp-cursor" /></span>
      </div>
      <div className="dp-seta" aria-hidden="true">⬇ em segundos</div>
      <div className="dp-passo"><b>2</b> Sai pronto, com o seu nome</div>
      <canvas ref={ref} className="dp-etiqueta" role="img" aria-label="Etiqueta “Feito à mão por Panetones da Dona Cida”, sabor Frutas cristalizadas" />
    </div>
  )
}
