// Identidade visual por oferta: só nas CAPAS. A UI geral (títulos, botões, fonte) é a mesma em todo o app.
// Aqui sai apenas a cor de fundo suave da área da capa (palette.bg) e a cor de destaque, como variáveis CSS do card.
import type { CSSProperties } from 'react'
import { hasOwnVisual, visualOf, type OfferId } from '../../shared/catalog'

export const themed = (id: OfferId): boolean => hasOwnVisual(id)

export function themeStyle(id: OfferId): CSSProperties | undefined {
  if (!hasOwnVisual(id)) return undefined
  const v = visualOf(id)
  return { '--o-accent': v.accentColor, '--o-bg': v.palette.bg } as CSSProperties
}
