// Textos da Conta da Fornada. Ficam FORA do teste de comunicação das ofertas (são texto da ferramenta, não de venda),
// mas seguem as mesmas regras: sem renda inventada, exemplos sempre rotulados, nada de "lucro garantido".
export const T = {
  nome: 'Conta da Fornada',
  sub: 'calculadora de custo e preço',
  necessidade: 'Antes de vender, descubra quanto sobra de verdade.',
  pergunta: 'Quanto custou essa fornada? Quanto sobra em cada panetone? Quantos preciso vender para fechar o mês?',
  honestidade: 'Conta feita só com os números que você digitou. Não é previsão de venda nem de ganho. O preço que seu cliente aceita depende da sua região e de quem compra de você.',
  exemploFicticio: 'Exemplo com números fictícios, não são seus nem de outras clientes.',
  precoExemplo: 'Preço de exemplo do Bônus 07. Troque pelo que você paga.',
  usarExemplos: 'Usar preços de exemplo do Bônus 07',
  usarExemplosNota: 'Os preços de exemplo ficam marcados como “exemplo” até você trocar pelos seus. Servem só para ver a conta funcionando.',
  grisFree: 'Conta grátis: você faz uma conta completa. Ela fica sua para sempre.',
  gateTitulo: 'A sua conta grátis já foi usada',
  gateTexto: 'As suas contas continuam aqui. Para fazer outras receitas, é só desbloquear.',
  semKit: 'As 100 receitas do livro fazem parte do kit. Sem o kit liberado, dá para fazer a conta de uma receita sua.',
  privacidade: 'Seus números ficam neste aparelho. Com a Conta da Fornada completa, uma cópia também fica na sua conta, só para você trocar de celular sem perder nada. Nada é vendido nem compartilhado, e você apaga tudo quando quiser.',
  privacidadeFree: 'Seus números ficam só neste aparelho. A cópia na conta faz parte da Conta da Fornada completa.',
  estorno: 'A ferramenta completa não está liberada no seu acesso agora. Suas contas e preços continuam aqui, e você pode exportar tudo.',
}

export const MEDIDA: Record<string, string> = { g: 'g', ml: 'ml', xic: 'xícara', cs: 'colher de sopa', cc: 'colher de chá', un: 'un' }

export const PERGUNTAS = [
  'Pesei os ingredientes na balança em vez de medir no olho.',
  'O preço que digitei é o do pacote que eu realmente compro.',
  'Contei a embalagem de cada unidade (caixa, fita, etiqueta).',
  'Contei o gás ou a energia do forno.',
  'Contei o que perco (queimou, murchou, sobrou sem vender).',
  'Contei a minha hora de trabalho, ou decidi de propósito não contar.',
  'Contei os custos que não são ingrediente (entrega, taxa do cartão, aplicativo).',
  'O rendimento é o que sai da minha forma, não o que o livro diz.',
  'Os preços dos ingredientes são de menos de 3 meses atrás.',
  'Conferi o resultado uma vez na calculadora do celular.',
]
export const PERGUNTAS_FREE = 3

// prévia travada: números redondos e fictícios (nunca de uma receita real)
export const PREVIA = {
  equilibrio: { fixos: 'R$ 300,00', sobra: 'R$ 10,00', un: 30, texto: 'Com R$ 300,00 de custos fixos e R$ 10,00 de sobra por unidade, são 30 unidades no mês só para cobrir os custos.' },
  meta: { meta: 'R$ 500,00', sobra: 'R$ 10,00', un: 50, texto: 'Para sobrar R$ 500,00 com R$ 10,00 por unidade, são 50 unidades no mês (sem contar os custos fixos).' },
  hora: { texto: 'Duas receitas: uma deixa mais por unidade, a outra deixa mais por hora de trabalho. A conta mostra qual compensa mais o seu tempo.' },
}
