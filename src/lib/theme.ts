// Identidade visual por oferta: variáveis CSS (cor, paleta, fonte do título) e carregamento leve da fonte (Google Fonts).
// A fonte só é pedida quando a oferta aparece na tela (e só uma vez). Sem internet ou se o pedido falhar, vale a fonte reserva:
// o app continua inteiro offline (o service worker nunca guarda respostas de outros domínios).
import { useEffect, useRef, type CSSProperties } from 'react'
import { hasOwnVisual, readableOn, titleFontUrl, visualOf, type OfferId } from '../../shared/catalog'

const FALLBACK = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display: "Impact, 'Arial Black', system-ui, sans-serif",
} as const

export const themed = (id: OfferId): boolean => hasOwnVisual(id)

export function themeStyle(id: OfferId): CSSProperties | undefined {
  if (!hasOwnVisual(id)) return undefined
  const v = visualOf(id)
  const family = v.titleFont.family ? `'${v.titleFont.family}', ${FALLBACK[v.titleFont.fallback]}` : FALLBACK[v.titleFont.fallback]
  return {
    '--o-accent': v.accentColor,
    '--o-primary': v.palette.primary,
    '--o-secondary': v.palette.secondary,
    '--o-on-secondary': readableOn(v.palette.secondary),
    '--o-bg': v.palette.bg,
    '--o-font': family,
    '--o-weight': v.titleFont.weight,
  } as CSSProperties
}

const loaded = new Set<string>()
export function loadTitleFont(id: OfferId) {
  if (typeof document === 'undefined' || !hasOwnVisual(id)) return
  const url = titleFontUrl(visualOf(id))
  if (!url || loaded.has(url) || navigator.onLine === false) return
  loaded.add(url)
  if (!document.querySelector('link[data-fonts-preconnect]')) {
    const pc = document.createElement('link')
    pc.rel = 'preconnect'
    pc.href = 'https://fonts.gstatic.com'
    pc.crossOrigin = ''
    pc.dataset.fontsPreconnect = '1'
    document.head.appendChild(pc)
  }
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = url
  // falha (offline, bloqueio): libera para tentar de novo numa próxima visita, e a fonte reserva continua valendo
  l.onerror = () => {
    loaded.delete(url)
    l.remove()
  }
  document.head.appendChild(l)
}

// carrega a fonte do título quando o card chega perto da tela (ou na hora, se `now`)
export function useTitleFont<T extends HTMLElement>(id: OfferId, now = false) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!hasOwnVisual(id)) return
    const el = ref.current
    if (now || !el || typeof IntersectionObserver === 'undefined') {
      loadTitleFont(id)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          loadTitleFont(id)
          io.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id, now])
  return ref
}
