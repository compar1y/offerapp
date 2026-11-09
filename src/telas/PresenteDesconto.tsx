import { useEffect, useState } from 'react'

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
