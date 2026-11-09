// Botões "Baixar PDF" e "Baixar planilha" de um material. O arquivo vem de /downloads/<nome>, que passa pelo middleware.ts
// (confere a sessão e a compra) e responde com Content-Disposition: attachment.
//   Android, iPhone no Safari e app instalado no Android: link de download comum, no mesmo endereço do app.
//     O celular salva o arquivo e a cliente continua na mesma tela (nada de aba nova).
//   iPhone com o app instalado na tela de início: o iOS não baixa arquivos dentro do app instalado. Então o app busca o arquivo
//     e, no segundo toque, abre o "Compartilhar" do iPhone, onde ela escolhe "Salvar em Arquivos" (ou manda no WhatsApp).
import { useState } from 'react'
import type { MaterialId } from '../../shared/catalogo'
import { arquivosDo, type Arquivo } from '../../shared/acesso'
import { temMaterial, useApp } from '../ctx'

const mb = (b: number) => (b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : `${(b / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`)
const MIME: Record<Arquivo['tipo'], string> = {
  pdf: 'application/pdf',
  planilha: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/** iPhone/iPad com o app aberto pelo ícone da tela de início */
function iosInstalado(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios && nav.standalone === true
}

export function BotoesBaixar({ m }: { m: MaterialId }) {
  const { eu } = useApp()
  if (!temMaterial(eu, m)) return null
  const lista = arquivosDo(m)
  if (!lista.length) return null
  return (
    <div className="baixar-lista">
      {lista.map((a) => <BotaoBaixar key={a.nome} a={a} />)}
    </div>
  )
}

function BotaoBaixar({ a }: { a: Arquivo }) {
  const { evento, toast } = useApp()
  const [fase, setFase] = useState<'pronto' | 'buscando' | 'salvar'>('pronto')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const rotulo = a.tipo === 'pdf' ? 'Baixar PDF' : 'Baixar planilha'
  const ico = a.tipo === 'pdf' ? '⬇️' : '📊'
  const href = `/downloads/${encodeURIComponent(a.nome)}`

  if (import.meta.env.VITE_DEMO === '1') {
    return (
      <button className="btn leve baixar" onClick={() => toast('Na prévia o arquivo não vem junto. No app de verdade, ele baixa direto no celular.')}>
        {ico} {rotulo} <small>{mb(a.bytes)}</small>
      </button>
    )
  }

  async function buscarParaIphone() {
    setFase('buscando')
    try {
      const r = await fetch(href, { credentials: 'same-origin' })
      if (r.status === 401) throw new Error('Entre de novo no app para baixar.')
      if (!r.ok) throw new Error('Este arquivo não está no seu acesso.')
      const f = new File([await r.blob()], a.nome, { type: MIME[a.tipo] })
      setArquivo(f)
      setFase('salvar')
    } catch (e) {
      setFase('pronto')
      toast(e instanceof TypeError ? 'Sem internet agora. Confira a conexão e tente de novo.' : e instanceof Error ? e.message : 'Não consegui baixar agora.')
    }
  }

  async function salvarNoIphone() {
    if (!arquivo) return
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: a.nome })
      } else {
        // iOS antigo, sem compartilhar arquivo: abre o arquivo por cima do app (o iPhone mostra o botão de compartilhar)
        location.href = URL.createObjectURL(arquivo)
      }
      evento('arquivo.baixado', { arquivo: a.nome, como: 'compartilhar' })
    } catch {
      /* ela fechou o compartilhar: o botão continua aí */
    }
  }

  if (iosInstalado()) {
    if (fase === 'salvar')
      return (
        <button className="btn baixar comprar-pulsa" onClick={salvarNoIphone}>
          💾 Salvar no iPhone <small>toque e escolha “Salvar em Arquivos”</small>
        </button>
      )
    return (
      <button className="btn leve baixar" onClick={buscarParaIphone} disabled={fase === 'buscando'}>
        {fase === 'buscando' ? 'Preparando o arquivo…' : <>{ico} {rotulo} <small>{mb(a.bytes)}</small></>}
      </button>
    )
  }

  return (
    <a className="btn leve baixar" href={href} download={a.nome} onClick={() => {
      evento('arquivo.baixado', { arquivo: a.nome, como: 'link' })
      toast('Baixando… o arquivo aparece nos downloads do celular.')
    }}>
      {ico} {rotulo} <small>{mb(a.bytes)}</small>
    </a>
  )
}
