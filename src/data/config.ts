// Tudo que muda de uma oferta para outra fica aqui.

export type ProductId = 'front' | 'bump' | 'upsell' | 'downsell'

export interface Product {
  id: ProductId
  name: string
  price: number
  // link do checkout da Wiapy; vazio = modo demonstração
  checkoutUrl: string
}

export const PRODUCTS: Record<ProductId, Product> = {
  front: { id: 'front', name: 'Receitas de Panetone', price: 37.9, checkoutUrl: '' },
  bump: { id: 'bump', name: 'Bônus da Fornada', price: 7.9, checkoutUrl: '' },
  upsell: { id: 'upsell', name: 'Kit Panetone Lucrativo', price: 67, checkoutUrl: '' },
  downsell: { id: 'downsell', name: 'Kit Panetone Lucrativo Essencial', price: 37, checkoutUrl: '' },
}

export const CONFIG = {
  brand: 'Fábrica de Panetones',
  // número com DDI e DDD, só dígitos
  whatsapp: '5500000000000',
  supportMessage: 'Oi! Comprei as receitas de panetone e preciso de ajuda com o acesso.',
  // true enquanto não há Supabase/Wiapy: qualquer e-mail entra e o pagamento é simulado
  demo: true,
}

export function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
