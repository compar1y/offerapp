import { useEffect, useState } from 'react'
import { DESCONTO } from '../../shared/desconto'

/** contagem regressiva até `ate` (ISO). Devolve null quando acabou. */
export function useRelogio(ate: string | undefined | null): string | null {
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => {
    if (!ate) return
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ate])
  if (!ate) return null
  const falta = Math.floor((Date.parse(ate) - agora) / 1000)
  if (falta <= 0) return null
  const h = Math.floor(falta / 3600)
  const m = Math.floor((falta % 3600) / 60)
  const s = falta % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** faixa do presente da primeira compra, com o relógio */
export function FaixaDesconto({ pct, ate, texto }: { pct: number; ate: string; texto?: string }) {
  const resta = useRelogio(ate)
  if (!resta) return null
  return (
    <div className="faixa-desconto" role="status">
      <span className="fd-titulo">🎁 Presente da sua primeira compra</span>
      <span className="fd-texto">{texto ?? `${pct}% OFF no próximo material`}</span>
      <span className="fd-relogio">Acaba em <b>{resta}</b></span>
    </div>
  )
}

/** aviso antes da compra (ela ainda não fez a primeira compra de extra) */
export function AvisoPresente({ compacto }: { compacto?: boolean }) {
  return (
    <div className={`aviso-presente${compacto ? ' compacto' : ''}`}>
      <span className="ap-ico" aria-hidden="true">🎁</span>
      <span><b>Presente de primeira compra</b>{compacto ? `Comprando qualquer material daqui, você ganha ${DESCONTO.pct}% OFF no próximo, por ${DESCONTO.horas} horas.` : `Comprando este material, você ganha ${DESCONTO.pct}% OFF no próximo material, válido por ${DESCONTO.horas} horas.`}</span>
    </div>
  )
}

/** barrinha fixa no topo da página de oferta, versão curta do aviso / do relógio */
export function BarraPresente({ ate }: { ate?: string | null }) {
  const resta = useRelogio(ate)
  if (ate && !resta) return null
  return (
    <div className="barra-presente" role="status">
      {resta ? <>🎁 <b>{DESCONTO.pct}% OFF</b> aqui · acaba em <b className="br-relogio">{resta}</b></> : <>🎁 Comprou, ganhou <b>{DESCONTO.pct}% OFF</b> no próximo</>}
    </div>
  )
}
