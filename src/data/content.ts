// Conteúdo de exemplo. Será trocado pelo conteúdo real do e-book, do bônus e do guia.

import type { ProductId } from './config'
import type { ImageId } from './images'

export interface Recipe {
  id: string
  title: string
  summary: string
  time: string
  yield: string
  ingredients: string[]
  steps: string[]
  image: ImageId
  // frase do rodapé que liga esta receita ao guia de vendas
  nextStep: string
}

export interface Lesson {
  id: string
  title: string
  image: ImageId
  body: string[]
}

export interface Module {
  id: string
  product: ProductId
  title: string
  subtitle: string
  mockup: ImageId
  lessons: Lesson[]
}

export const RECIPES: Recipe[] = [
  {
    id: 'tradicional',
    image: 'receita-tradicional',
    title: 'Panetone tradicional de frutas',
    summary: 'A massa base do e-book, com frutas cristalizadas e uva-passa.',
    time: '6 h (com fermentação)',
    yield: '3 panetones de 500 g',
    ingredients: [
      '1 kg de farinha de trigo',
      '30 g de fermento biológico seco',
      '250 g de açúcar',
      '200 g de manteiga em temperatura ambiente',
      '6 gemas',
      '300 ml de leite morno',
      '1 colher (chá) de sal',
      'Raspas de 1 laranja e 1 limão',
      '1 colher (sopa) de essência de panetone',
      '300 g de frutas cristalizadas e uva-passa',
    ],
    steps: [
      'Misture o fermento, 1 colher de açúcar, 100 ml de leite e 100 g de farinha. Deixe crescer por 20 minutos.',
      'Junte o restante do açúcar, as gemas, as raspas, a essência e o leite. Misture bem.',
      'Acrescente a farinha aos poucos e, por último, o sal e a manteiga. Sove até a massa ficar lisa e soltar das mãos.',
      'Deixe descansar coberta por 1 h 30 min, até dobrar de volume.',
      'Abra a massa, espalhe as frutas enfarinhadas e enrole. Divida em 3 partes e coloque nas formas.',
      'Deixe crescer até chegar perto da borda da forma, cerca de 2 h.',
      'Faça um corte em cruz, coloque um pouco de manteiga e asse em forno a 180 °C por cerca de 40 minutos.',
    ],
    nextStep: 'Seu primeiro panetone saiu? O próximo passo é saber como oferecer para quem está perto de você.',
  },
  {
    id: 'chocotone',
    image: 'receita-chocotone',
    title: 'Chocotone de gotas',
    summary: 'A mesma massa, trocando as frutas por gotas de chocolate.',
    time: '6 h (com fermentação)',
    yield: '3 chocotones de 500 g',
    ingredients: [
      'Massa base do panetone tradicional, sem as frutas',
      '300 g de gotas de chocolate forneável',
      '2 colheres (sopa) de cacau em pó (opcional, para massa escura)',
    ],
    steps: [
      'Prepare a massa base até a primeira fermentação.',
      'Se quiser massa escura, misture o cacau junto com a farinha.',
      'Abra a massa, espalhe as gotas e enrole. Divida nas formas.',
      'Deixe crescer até perto da borda e asse a 180 °C por cerca de 40 minutos.',
    ],
    nextStep: 'Chocotone é o que mais sai nas encomendas de fim de ano. Veja no guia como montar a sua tabela de sabores.',
  },
  {
    id: 'trufado',
    image: 'receita-trufado',
    title: 'Panetone trufado no pote',
    summary: 'Versão recheada e cortada em fatias, vendida em pote.',
    time: '1 h (com o panetone pronto)',
    yield: '6 potes de 250 ml',
    ingredients: [
      '1 panetone ou chocotone pronto',
      '1 lata de leite condensado',
      '1 caixinha de creme de leite',
      '2 colheres (sopa) de chocolate em pó',
      '1 colher (sopa) de manteiga',
    ],
    steps: [
      'Leve ao fogo o leite condensado, o chocolate e a manteiga, mexendo até desgrudar do fundo.',
      'Desligue, misture o creme de leite e deixe esfriar.',
      'Corte o panetone em cubos.',
      'Monte os potes em camadas: panetone, trufa, panetone, trufa.',
      'Leve à geladeira por 1 hora antes de servir.',
    ],
    nextStep: 'Pote rende mais fatias por panetone. O guia mostra como apresentar e embalar para presente.',
  },
]

export const MODULES: Module[] = [
  {
    id: 'bonus',
    mockup: 'mockup-bonus',
    product: 'bump',
    title: 'Bônus da Fornada',
    subtitle: 'Recheios, coberturas e embalagens',
    lessons: [
      {
        id: 'recheios',
        image: 'aula-recheios',
        title: '5 recheios cremosos',
        body: ['Conteúdo do bônus vem aqui: brigadeiro, doce de leite, ninho, maracujá e trufa branca.'],
      },
      {
        id: 'embalagens',
        image: 'aula-embalagens',
        title: 'Embalagens simples',
        body: ['Conteúdo do bônus vem aqui: saquinho de celofane, laço e etiqueta feita em casa.'],
      },
    ],
  },
  {
    id: 'guia',
    mockup: 'mockup-guia',
    product: 'upsell',
    title: 'Kit Panetone Lucrativo',
    subtitle: 'Guia completo para vender o que você faz',
    lessons: [
      { id: 'preco', image: 'aula-preco', title: 'Como calcular o preço de cada panetone', body: ['Conteúdo do guia em produção.'] },
      { id: 'oferecer', image: 'aula-oferecer', title: 'Onde e para quem oferecer', body: ['Conteúdo do guia em produção.'] },
      { id: 'whatsapp', image: 'aula-whatsapp', title: 'Mensagens prontas para o WhatsApp', body: ['Conteúdo do guia em produção.'] },
      { id: 'encomendas', image: 'aula-encomendas', title: 'Organizando as encomendas de dezembro', body: ['Conteúdo do guia em produção.'] },
      { id: 'apresentacao', image: 'aula-apresentacao', title: 'Fotos e apresentação que dão vontade', body: ['Conteúdo do guia em produção.'] },
    ],
  },
  {
    id: 'essencial',
    mockup: 'mockup-essencial',
    product: 'downsell',
    title: 'Kit Panetone Lucrativo Essencial',
    subtitle: 'O básico para começar a vender',
    lessons: [
      { id: 'preco', image: 'aula-preco', title: 'Como calcular o preço de cada panetone', body: ['Conteúdo do guia em produção.'] },
      { id: 'whatsapp', image: 'aula-whatsapp', title: 'Mensagens prontas para o WhatsApp', body: ['Conteúdo do guia em produção.'] },
    ],
  },
]

export const OFFER = {
  upsell: {
    image: 'oferta-guia' as ImageId,
    headline: 'Você já sabe fazer. Agora aprenda a oferecer.',
    intro:
      'O Kit Panetone Lucrativo é o passo depois das receitas: um guia direto para quem quer transformar a fornada de Natal em encomendas.',
    bullets: [
      'Como calcular o preço de cada panetone sem ter prejuízo',
      'Onde e para quem oferecer, começando pelos conhecidos',
      'Mensagens prontas para mandar no WhatsApp',
      'Como organizar as encomendas de dezembro sem se perder',
      'Fotos e apresentação que dão vontade de comprar',
    ],
  },
  downsell: {
    image: 'oferta-essencial' as ImageId,
    headline: 'Antes de ir: a versão essencial do guia',
    intro: 'Só o que você precisa para começar: o cálculo do preço e as mensagens prontas.',
    bullets: ['Como calcular o preço de cada panetone', 'Mensagens prontas para o WhatsApp'],
  },
  bump: {
    image: 'oferta-bonus' as ImageId,
    headline: 'Complete sua fornada',
    intro: 'Recheios cremosos e embalagens simples para deixar o panetone com cara de presente.',
    bullets: ['5 recheios cremosos', 'Embalagens simples e baratas'],
  },
}
