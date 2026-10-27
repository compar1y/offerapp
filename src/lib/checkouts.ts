// public/checkouts.json: links de compra e "pronto" de cada oferta, do combo e do bump. UM arquivo, lido em runtime
// (fetch sem cache; o service worker nunca guarda este arquivo), para trocar link e ready sem mexer no código. Formato em shared/catalog.ts.
import { applyCheckoutPrices, buyUrlOf, parseCheckouts, readyIdsOf, type CheckoutMap } from '../../shared/catalog'

let map: CheckoutMap = {}
const subs = new Set<() => void>()
export const subscribeCheckouts = (f: () => void): (() => void) => {
  subs.add(f)
  return () => subs.delete(f)
}

export async function loadCheckouts(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}checkouts.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    map = parseCheckouts(await res.json())
    applyCheckoutPrices(map)
    subs.forEach((f) => f())
  } catch {
    // sem rede ou arquivo inválido: segue com o que já tinha (no início, nada pronto = "Disponível em breve")
  }
}

export const getCheckouts = (): CheckoutMap => map
// link de compra: só com ready:true E link no arquivo
export const buyUrl = (id: string): string | null => buyUrlOf(map, id)
export const isReady = (id: string): boolean => map[id]?.ready === true
export const readySet = (): ReadonlySet<string> => readyIdsOf(map)
