import { useEffect, useState } from 'react'
import { DESCONTO } from '../../shared/desconto'
import { agoraServidor } from '../relogio'

// Presente de 30% com prazo REAL de 3 h (Levi, 10/11): o servidor só manda o link enquanto o prazo vale,
// e aqui o relógio mostra quanto tempo o presente ainda fica guardado. Tom de presente, sem pressão.

/** contagem regressiva até `ate` (ISO), no relógio do servidor. Devolve null quando acabou. */
export function useRelogio(ate: string | undefined | null): string | null {
  const [, tique] = useState(0)
  useEffect(() => {
    if (!ate) return
    const id = setInterval(() => tique((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [ate])
  return restante(ate)
}

export function restante(ate: string | undefined | null, agora = agoraServidor()): string | null {
  if (!ate) return null
  const falta = Math.floor((Date.parse(ate) - agora) / 1000)
  if (!(falta > 0)) return null
  const h = Math.floor(falta / 3600)
  const m = Math.floor((falta % 3600) / 60)
  const s = falta % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** faixa do presente já ganho, com o relógio: onde ele vale ou, na oferta, o preço com desconto */
export function FaixaDesconto({ pct, ate, titulo, texto, de, por }: { pct: number; ate: string; titulo?: string; texto?: string; de?: string; por?: string }) {
  const resta = useRelogio(ate)
  if (!resta) return null
  return (
    <div className="faixa-desconto" role="status">
      <span className="fd-titulo">🎁 {titulo ?? 'Seu presente da primeira compra'}</span>
      {por ? (
        <span className="fd-preco"><s>R${de}</s> por <b>R${por}</b></span>
      ) : (
        <span className="fd-texto">{texto ?? `${pct}% de presente em mais um material`}</span>
      )}
      <span className="fd-relogio">Seu presente fica guardado por <b>{resta}</b></span>
    </div>
  )
}

/** aviso antes da compra (ela ainda não fez a primeira compra de extra) */
export function AvisoPresente({ texto, compacto }: { texto: string; compacto?: boolean }) {
  return (
    <div className={`aviso-presente${compacto ? ' compacto' : ''}`}>
      <span className="ap-ico" aria-hidden="true">🎁</span>
      <span><b>Seu presente da primeira compra</b>{texto}</span>
    </div>
  )
}

/** barrinha fixa no topo da página de oferta: o desconto já vale aqui (com o relógio), ou comprando ela ganha */
export function BarraPresente({ ate }: { ate?: string | null }) {
  const resta = useRelogio(ate)
  if (ate && !resta) return null
  return (
    <div className="barra-presente" role="status">
      {resta ? <>🎁 <b>{DESCONTO.pct}% de presente</b> aqui · guardado por <b className="br-relogio">{resta}</b></> : <>🎁 Primeira compra: <b>{DESCONTO.pct}% de presente</b> em mais um</>}
    </div>
  )
}
