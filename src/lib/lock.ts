import { BUMP, COPY, brl, unlockPrice, type Item } from '../../shared/catalog'
import { supportUrl } from '../data/config'
import { buyUrl } from './checkouts'

// o que o botão das Fichas de Socorro (bump) faz quando ela não está no acesso: abre o checkout do public/checkouts.json (id "bump", com ready:true)
// ou, sem link, mostra "Disponível em breve" + "Quero ser avisada". Os materiais do kit nunca têm botão de compra.
export function lockInfo(): { label: string; buy: string; price: string; href: string; note: string; buyable: boolean } {
  const href = buyUrl('bump') ?? ''
  return {
    buyable: !!href,
    label: href ? COPY.button.unlock(unlockPrice(BUMP.priceCents)) : `Fichas de Socorro · ${brl(BUMP.priceCents)} · ${COPY.button.soon.toLowerCase()}`,
    buy: COPY.button.unlock(unlockPrice(BUMP.priceCents)),
    price: brl(BUMP.priceCents),
    href,
    note: href ? '' : `A compra pelo app abre em breve. Toque em "${COPY.button.notify}" e avisamos você.`,
  }
}

// mensagem para quem abre um material do kit sem ter o kit liberado (link direto)
export function noKitInfo(item: Item): { href: string } {
  return { href: supportUrl(`Oi! Não consegui abrir "${item.title}" no app. Meu acesso ao kit não aparece.`) }
}
