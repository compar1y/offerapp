// Todas as imagens do app. Para trocar um bloco vazio por imagem real,
// salve o arquivo em public/img/ e preencha `src` (ex.: 'img/receita-tradicional.webp').
// A lista completa, com o que cada imagem deve mostrar, está em IMAGENS.md.

export interface ImageSlot {
  src: string
  // o que a imagem precisa mostrar (aparece no bloco vazio)
  label: string
  // proporção largura / altura
  ratio: string
}

export const IMAGES = {
  'login-hero': { src: '', label: 'Panetone caseiro cortado, mesa de Natal', ratio: '4 / 3' },
  'boas-vindas': { src: '', label: 'Capa do vídeo de boas-vindas', ratio: '16 / 9' },
  'inicio-hero': { src: '', label: 'Mãos tirando panetone do forno', ratio: '16 / 7' },

  'receita-tradicional': { src: '', label: 'Foto: panetone tradicional de frutas', ratio: '4 / 3' },
  'receita-chocotone': { src: '', label: 'Foto: chocotone de gotas', ratio: '4 / 3' },
  'receita-trufado': { src: '', label: 'Foto: panetone trufado no pote', ratio: '4 / 3' },

  'mockup-bonus': { src: '', label: 'Mockup: e-book Bônus da Fornada', ratio: '4 / 3' },
  'mockup-guia': { src: '', label: 'Mockup: Kit Panetone Lucrativo (e-book + celular)', ratio: '4 / 3' },
  'mockup-essencial': { src: '', label: 'Mockup: Kit Panetone Lucrativo Essencial', ratio: '4 / 3' },

  'oferta-guia': { src: '', label: 'Mockup grande do Kit com panetones embalados', ratio: '1 / 1' },
  'oferta-essencial': { src: '', label: 'Mockup grande do Kit Essencial', ratio: '1 / 1' },
  'oferta-bonus': { src: '', label: 'Mockup grande do Bônus da Fornada com recheios', ratio: '1 / 1' },

  'aula-preco': { src: '', label: 'Ilustração: calculadora e panetone com etiqueta de preço', ratio: '16 / 9' },
  'aula-oferecer': { src: '', label: 'Ilustração: vizinhos e colegas recebendo panetone', ratio: '16 / 9' },
  'aula-whatsapp': { src: '', label: 'Mockup: conversa de WhatsApp com encomenda', ratio: '16 / 9' },
  'aula-encomendas': { src: '', label: 'Ilustração: caderno de encomendas de dezembro', ratio: '16 / 9' },
  'aula-apresentacao': { src: '', label: 'Foto: panetone embalado para presente', ratio: '16 / 9' },
  'aula-recheios': { src: '', label: 'Foto: 5 potes de recheio', ratio: '16 / 9' },
  'aula-embalagens': { src: '', label: 'Foto: panetone em celofane com laço', ratio: '16 / 9' },

  'pagamento-ok': { src: '', label: 'Ilustração: presente aberto com o kit dentro', ratio: '16 / 9' },
} satisfies Record<string, ImageSlot>

export type ImageId = keyof typeof IMAGES
