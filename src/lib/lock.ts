import { BUMP, brl, type Item } from '../../shared/catalog'
import { supportUrl } from '../data/config'

// o que o botão de um produto adicional bloqueado faz: abre o checkout configurado ou, se vazio, o WhatsApp de suporte.
// Só as Fichas de Socorro (bump) e as ofertas adicionais ficam bloqueadas; os materiais do kit nunca têm botão de compra.
export function lockInfo(): { label: string; buy: string; price: string; href: string; note: string } {
  return {
    label: `Adicionar as Fichas de Socorro por ${brl(BUMP.priceCents)}`,
    buy: 'Comprar as Fichas de Socorro',
    price: brl(BUMP.priceCents),
    href: BUMP.checkoutUrl || supportUrl(`Oi! Quero adicionar as +20 Fichas de Socorro do Panetone (${brl(BUMP.priceCents)}) ao meu acesso.`),
    note: BUMP.checkoutUrl ? '' : 'O checkout ainda não está configurado: este botão abre o WhatsApp do suporte.',
  }
}

// mensagem para quem abre um material do kit sem ter o kit liberado (link direto)
export function noKitInfo(item: Item): { href: string } {
  return { href: supportUrl(`Oi! Não consegui abrir "${item.title}" no app. Meu acesso ao kit não aparece.`) }
}
