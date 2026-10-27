// Imagens do app (arquivos reais em public/img/). SÓ mockups de produto: nada de foto ou ilustração decorativa.
// O que ainda não existe está em IMAGENS-FALTANDO.md (fora do repositório do app).

import type { ItemId, Offer, OfferId } from '../../shared/catalog'

export interface Img {
  src: string
  alt: string
  // largura / altura naturais do arquivo, para reservar o espaço sem esticar
  w: number
  h: number
}

const img = (file: string, alt: string, w: number, h: number): Img => ({ src: `img/${file}`, alt, w, h })

// mockups com fundo transparente: verticais dos bônus 533x800; capas planas do principal e do bump
// (as ofertas adicionais ainda não têm mockup: ver IMAGENS-FALTANDO.md)
export const MOCKUPS: Record<Exclude<ItemId, OfferId>, Img> = {
  main: img('mockup-produto-principal.webp', 'Capa do livro Fábrica de Panetones Caseiros', 640, 960),
  'bonus-01': img('mockup-bonus-01.webp', 'Livro 3D do Bônus 01: Guia de Embalagem Que Vende', 533, 800),
  'bonus-02': img('mockup-bonus-02.webp', 'Livro 3D do Bônus 02: 20 Ideias de Kits de Natal', 533, 800),
  'bonus-03': img('mockup-bonus-03.webp', 'Livro 3D do Bônus 03: Cardápio e Fotos', 533, 800),
  'bonus-04': img('mockup-bonus-04.webp', 'Livro 3D do Bônus 04: Mensagens de Natal', 533, 800),
  'bonus-05': img('mockup-bonus-05.webp', 'Livro 3D do Bônus 05: Planejador de Produção', 533, 800),
  'bonus-06': img('mockup-bonus-06.webp', 'Livro 3D do Bônus 06: Plano B Trufado Rápido', 533, 800),
  'bonus-07': img('mockup-bonus-07.webp', 'Livro 3D do Bônus 07: Tabela de Custo e Preço de Venda', 533, 800),
  'bonus-08': img('mockup-bonus-08.webp', 'Livro 3D do Bônus 08 Extra: 50 Receitas do Cardápio de Natal', 533, 800),
  bump: img('mockup-bump.webp', 'Capa do guia +20 Fichas de Socorro do Panetone', 640, 960),
}

// capa de uma oferta: o mockup real, ou null se ainda não existe (aí a tela usa o placeholder "em breve", só em modo demonstração)
import catalogImages from './catalog-images.json'

// mockup de produto do catálogo: public/img/catalogo/<id>.webp (lista gerada por `npm run catalogo:imagens`)
export function catalogImage(o: Offer): Img | null {
  if (!(o.catalog || o.tool) || !(catalogImages as string[]).includes(o.id)) return null
  const [w, h] = o.imageRatio === '2:3' ? [640, 960] : o.imageRatio === '4:5' ? [640, 800] : [800, 600]
  return img(`catalogo/${o.id}.webp`, `Mockup de ${o.title}: ${o.imageType}`, w, h)
}

// faixa 900x300 com os mini-mockups dos bônus: public/img/catalogo/<id>-bonus.webp (só ofertas com bônus)
export function catalogBonusImage(o: Offer): Img | null {
  if (!o.catalog || !o.bonus?.length || !(catalogImages as string[]).includes(`${o.id}-bonus`)) return null
  return img(`catalogo/${o.id}-bonus.webp`, `Mini-mockups dos bônus de ${o.title}: ${o.bonus.map((b) => b.title).join('; ')}`, 900, 300)
}

export function offerCover(o: Offer): Img | null {
  return o.cover ? img(o.cover, `Capa de ${o.title}`, 533, 800) : null
}
