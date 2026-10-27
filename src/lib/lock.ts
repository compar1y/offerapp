import { BUMP, brl, type Item } from '../../shared/catalog'
import { supportUrl } from '../data/config'

// o que o botão de um produto adicional bloqueado faz: abre o checkout configurado (BUMP.checkoutUrl) ou, se vazio, vira "Quero ser avisada".
// Só as Fichas de Socorro (bump) e as ofertas adicionais ficam bloqueadas; os materiais do kit nunca têm botão de compra.
export function lockInfo(): { label: string; buy: string; price: string; href: string; note: string; buyable: boolean } {
  return {
    buyable: !!BUMP.checkoutUrl,
    label: BUMP.checkoutUrl ? `Adicionar as Fichas de Socorro por ${brl(BUMP.priceCents)}` : `Fichas de Socorro · ${brl(BUMP.priceCents)} · em breve aqui`,
    buy: 'Comprar as Fichas de Socorro',
    price: brl(BUMP.priceCents),
    href: BUMP.checkoutUrl,
    note: BUMP.checkoutUrl ? '' : 'A compra pelo app ainda não está aberta. Toque em "Quero ser avisada" e registramos o seu interesse.',
  }
}

// mensagem para quem abre um material do kit sem ter o kit liberado (link direto)
export function noKitInfo(item: Item): { href: string } {
  return { href: supportUrl(`Oi! Não consegui abrir "${item.title}" no app. Meu acesso ao kit não aparece.`) }
}
