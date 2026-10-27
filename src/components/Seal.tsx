import { useState } from 'react'
import { SEAL_FILES, type SealIcon } from '../../shared/game'
import { SEAL_IMAGES_READY } from '../data/selos'

const G: Record<SealIcon, string> = {
  aprendiz: 'M9 3h6v5l3 2v10H6V10l3-2zM9 3v5M15 3v5',
  fornada: 'M5 19h14M6 19c0-6 2-11 6-11s6 5 6 11M12 8V5',
  confeiteira: 'M8 4c2.5 0 4 2 4 4.5S10.5 13 8 13 4 11 4 8.5 5.5 4 8 4zM10.5 12l8 8',
  mestra: 'M4 17L3 8l5 4 4-7 4 7 5-4-1 9zM5 20h14',
  receita: 'M5 12l4.5 4.5L19 7',
  casa: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  sequencia: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  desafio: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  socorro: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  encomenda: 'M3 8l9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9',
  conta: 'M6 3h12v18H6zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2',
  presente: 'M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8c-2-4-6-3-5 0 .5 1.5 3 1.5 5 0zM12 8c2-4 6-3 5 0-.5 1.5-3 1.5-5 0z',
  contas: 'M5 3h14v18H5zM8 7h8M8 11h3M13 11h3M8 15h3M13 15h3M8 19h8',
  venda: 'M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2zM9 9h6M9 13h4',
  variedade: 'M7 3v7a2 2 0 0 0 2 2v9M11 3v7M7 3v7M17 3c-2 2-2 6 0 8v10',
}

// selo redondo: contorno colorido + símbolo. "grey" = ainda não conquistado; "gold" = Receita de casa.
export function Seal({ icon, grey = false, gold = false, size = 64 }: { icon: SealIcon; grey?: boolean; gold?: boolean; size?: number }) {
  const [broken, setBroken] = useState(false)
  const file = SEAL_FILES[icon]
  const cls = `seal${grey ? ' seal-grey' : ''}${gold ? ' seal-gold' : ''}`
  if (file && !broken && SEAL_IMAGES_READY.has(icon)) return <img className={`${cls} seal-img`} src={`${import.meta.env.BASE_URL}selos/${file}.webp`} width={size} height={size} alt="" loading="lazy" onError={() => setBroken(true)} />
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="11" className="seal-bg" />
      <g transform="translate(4.8 4.8) scale(0.6)" className="seal-glyph" strokeWidth="2.2">
        <path d={G[icon]} />
      </g>
    </svg>
  )
}
