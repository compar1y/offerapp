// GERADO por scripts/gen-receitas-custo.mjs a partir do Bônus 07 (calc.py + receitas-100.json). NÃO edite à mão.
// Preços e medidas são EXEMPLOS do Bônus 07, não preços de mercado: a cliente troca pelos dela. Valores em centavos inteiros.
// Fórmula e arredondamento seguem o calc.py (fonte única do Bônus 07): ver shared/calc.ts e o teste de diferença zero em server/test/smoke.ts.

export type UnidadeBase = 'g' | 'ml' | 'un'
export type Medida = 'g' | 'ml' | 'xic' | 'cs' | 'cc' | 'un'
export interface IngredienteBase {
  id: string
  nome: string
  embalagem: string
  precoCents: number
  qtdPacote: number
  unidade: UnidadeBase
  grupo: number
}
// [ingrediente, quantidade (número ou fração em texto, ex.: "1/2"), medida]
export type LinhaTxt = [string, string, Medida]
export type Custeio =
  | { kind: 'completa'; itens: LinhaTxt[] }
  | { kind: 'variacao'; base: number; remove: LinhaTxt[]; add: LinhaTxt[] }
  | { kind: 'montagem'; base: number; baseUn: number; add: LinhaTxt[] }
export interface ReceitaCusto {
  n: number
  nome: string
  secao: string
  unidades: number
  // G = chocotone/panetone de 15 cm no forno; M = minichocotone de 7 cm na air fryer
  tipo: 'G' | 'M'
  custeio: Custeio
}

export const INGREDIENTES_BASE: IngredienteBase[] = [
  {"id":"farinha","nome":"Farinha de trigo","embalagem":"pacote de 1 kg","precoCents":700,"qtdPacote":1000,"unidade":"g","grupo":1},
  {"id":"acucar","nome":"Açúcar","embalagem":"pacote de 1 kg","precoCents":500,"qtdPacote":1000,"unidade":"g","grupo":1},
  {"id":"manteiga","nome":"Manteiga","embalagem":"tablete de 200 g","precoCents":1400,"qtdPacote":200,"unidade":"g","grupo":1},
  {"id":"leite","nome":"Leite","embalagem":"caixa de 1 litro","precoCents":600,"qtdPacote":1000,"unidade":"ml","grupo":1},
  {"id":"leite_po","nome":"Leite em pó","embalagem":"lata de 400 g","precoCents":2200,"qtdPacote":400,"unidade":"g","grupo":1},
  {"id":"gema","nome":"Ovo (cada gema conta 1 ovo)","embalagem":"dúzia","precoCents":1200,"qtdPacote":12,"unidade":"un","grupo":1},
  {"id":"fermento_fresco","nome":"Fermento biológico fresco","embalagem":"tablete de 100 g","precoCents":800,"qtdPacote":100,"unidade":"g","grupo":1},
  {"id":"fermento_seco","nome":"Fermento biológico seco","embalagem":"sachê de 10 g","precoCents":300,"qtdPacote":10,"unidade":"g","grupo":1},
  {"id":"sal","nome":"Sal","embalagem":"pacote de 1 kg","precoCents":300,"qtdPacote":1000,"unidade":"g","grupo":2},
  {"id":"limao","nome":"Limão","embalagem":"1 unidade","precoCents":50,"qtdPacote":1,"unidade":"un","grupo":2},
  {"id":"laranja","nome":"Laranja","embalagem":"1 unidade","precoCents":100,"qtdPacote":1,"unidade":"un","grupo":2},
  {"id":"baunilha","nome":"Extrato de baunilha","embalagem":"frasco de 30 ml","precoCents":900,"qtdPacote":30,"unidade":"ml","grupo":2},
  {"id":"vinho_tinto","nome":"Vinho tinto","embalagem":"garrafa de 750 ml","precoCents":2500,"qtdPacote":750,"unidade":"ml","grupo":2},
  {"id":"frutas_cristalizadas","nome":"Frutas cristalizadas","embalagem":"pacote de 200 g","precoCents":1000,"qtdPacote":200,"unidade":"g","grupo":2},
  {"id":"passas","nome":"Uvas-passas","embalagem":"pacote de 200 g","precoCents":800,"qtdPacote":200,"unidade":"g","grupo":2},
  {"id":"gotas_chocolate","nome":"Gotas de chocolate meio amargo","embalagem":"pacote de 1 kg","precoCents":5000,"qtdPacote":1000,"unidade":"g","grupo":2},
  {"id":"gotas_chocolate_branco","nome":"Gotas de chocolate branco","embalagem":"pacote de 1 kg","precoCents":5500,"qtdPacote":1000,"unidade":"g","grupo":3},
  {"id":"cobertura_meio_amargo","nome":"Cobertura fracionada meio amarga","embalagem":"barra de 1 kg","precoCents":2800,"qtdPacote":1000,"unidade":"g","grupo":3},
  {"id":"cobertura_ao_leite","nome":"Cobertura fracionada ao leite","embalagem":"barra de 1 kg","precoCents":2900,"qtdPacote":1000,"unidade":"g","grupo":3},
  {"id":"cobertura_branca","nome":"Cobertura fracionada branca","embalagem":"barra de 1 kg","precoCents":3000,"qtdPacote":1000,"unidade":"g","grupo":3},
  {"id":"coco_ralado","nome":"Coco seco ralado sem açúcar","embalagem":"pacote de 100 g","precoCents":400,"qtdPacote":100,"unidade":"g","grupo":3},
  {"id":"amendoa_laminada","nome":"Amêndoas laminadas","embalagem":"pacote de 100 g","precoCents":1200,"qtdPacote":100,"unidade":"g","grupo":3},
  {"id":"avela","nome":"Avelãs","embalagem":"pote de 350 g","precoCents":2100,"qtdPacote":350,"unidade":"g","grupo":3},
  {"id":"pistache","nome":"Pistache","embalagem":"pacote de 100 g","precoCents":2500,"qtdPacote":100,"unidade":"g","grupo":3},
  {"id":"nozes","nome":"Nozes","embalagem":"pacote de 100 g","precoCents":1400,"qtdPacote":100,"unidade":"g","grupo":4},
  {"id":"castanha_caju","nome":"Castanha-de-caju","embalagem":"pacote de 100 g","precoCents":900,"qtdPacote":100,"unidade":"g","grupo":4},
  {"id":"damasco_seco","nome":"Damasco seco","embalagem":"pacote de 200 g","precoCents":1200,"qtdPacote":200,"unidade":"g","grupo":4},
  {"id":"biscoito_maisena","nome":"Biscoito de maisena","embalagem":"pacote de 400 g","precoCents":600,"qtdPacote":400,"unidade":"g","grupo":4},
  {"id":"amendoim","nome":"Amendoim torrado","embalagem":"pacote de 500 g","precoCents":1000,"qtdPacote":500,"unidade":"g","grupo":4},
  {"id":"nibs_cacau","nome":"Nibs de cacau","embalagem":"pacote de 100 g","precoCents":1200,"qtdPacote":100,"unidade":"g","grupo":4},
  {"id":"pacoca","nome":"Paçoca","embalagem":"pacote de 500 g","precoCents":1200,"qtdPacote":500,"unidade":"g","grupo":4},
  {"id":"creme_avela","nome":"Creme de avelã","embalagem":"pote de 650 g","precoCents":3000,"qtdPacote":650,"unidade":"g","grupo":5},
  {"id":"doce_leite","nome":"Doce de leite firme","embalagem":"pote de 400 g","precoCents":1000,"qtdPacote":400,"unidade":"g","grupo":5},
  {"id":"doce_abobora","nome":"Doce de abóbora firme","embalagem":"pote de 400 g","precoCents":900,"qtdPacote":400,"unidade":"g","grupo":5},
  {"id":"goiabada_cremosa","nome":"Goiabada cremosa firme","embalagem":"pote de 400 g","precoCents":800,"qtdPacote":400,"unidade":"g","grupo":5},
  {"id":"ganache_meio_amargo","nome":"Ganache meio amarga pronta","embalagem":"pote de 1 kg","precoCents":3800,"qtdPacote":1000,"unidade":"g","grupo":5},
  {"id":"recheio_brigadeiro","nome":"Recheio de brigadeiro","embalagem":"pote de 1 kg","precoCents":1800,"qtdPacote":1000,"unidade":"g","grupo":5},
  {"id":"recheio_leite_po","nome":"Recheio de leite em pó","embalagem":"pote de 1 kg","precoCents":2000,"qtdPacote":1000,"unidade":"g","grupo":5},
  {"id":"recheio_choc_branco","nome":"Recheio de chocolate branco","embalagem":"pote de 1 kg","precoCents":3200,"qtdPacote":1000,"unidade":"g","grupo":5},
  {"id":"recheio_maracuja","nome":"Recheio de maracujá","embalagem":"pote de 1 kg","precoCents":2500,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_limao","nome":"Recheio de limão","embalagem":"pote de 1 kg","precoCents":2500,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_frutas_vermelhas","nome":"Recheio de frutas vermelhas","embalagem":"pote de 1 kg","precoCents":2200,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_caramelo_salgado","nome":"Recheio de caramelo salgado","embalagem":"pote de 1 kg","precoCents":2600,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_cafe","nome":"Recheio de café","embalagem":"pote de 1 kg","precoCents":2400,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_damasco","nome":"Recheio de damasco","embalagem":"pote de 1 kg","precoCents":2400,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_ameixa","nome":"Recheio de ameixa","embalagem":"pote de 1 kg","precoCents":2400,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_choc_laranja","nome":"Recheio de chocolate com laranja","embalagem":"pote de 1 kg","precoCents":2800,"qtdPacote":1000,"unidade":"g","grupo":6},
  {"id":"recheio_choc_menta","nome":"Recheio de chocolate com menta","embalagem":"pote de 1 kg","precoCents":2800,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_castanha_caju","nome":"Recheio de castanha-de-caju","embalagem":"pote de 1 kg","precoCents":3000,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_amendoim","nome":"Recheio de amendoim","embalagem":"pote de 1 kg","precoCents":2200,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_baunilha","nome":"Recheio de baunilha","embalagem":"pote de 1 kg","precoCents":2200,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_canela","nome":"Recheio de canela","embalagem":"pote de 1 kg","precoCents":2200,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_coco","nome":"Recheio de coco","embalagem":"pote de 1 kg","precoCents":2200,"qtdPacote":1000,"unidade":"g","grupo":7},
  {"id":"recheio_pistache","nome":"Recheio de pistache","embalagem":"pote de 1 kg","precoCents":4500,"qtdPacote":1000,"unidade":"g","grupo":7},
]

// ingredientes do PDF que usam o mesmo preço de outro; água da torneira custa zero
export const ALIAS: Record<string, string> = {"recheio_abobora":"doce_abobora","recheio_goiabada":"goiabada_cremosa","uva_passa":"passas"}
export const GRATIS: readonly string[] = ['agua']

// medidas caseiras -> g ou ml (xícara de 240 ml). A cliente pesa na balança dela.
export const CONVERSOES = {
  xic: {"farinha":120,"acucar":180,"frutas_cristalizadas":150,"passas":150,"leite":240,"agua":240} as Record<string, number>,
  csMl: 15,
  ccMl: 5,
  ccG: {"manteiga":5,"sal":6} as Record<string, number>,
  un: {"gema":1,"limao":1,"laranja":1} as Record<string, number>,
}

// embalagem de exemplo por item (centavos) e por tipo
export const EMBALAGEM_ITENS: Record<string, { nome: string; cents: number }> = {"forma_15":{"nome":"Forma de papel de 15 cm","cents":120},"forma_7":{"nome":"Forma de papel de 7 cm (mini)","cents":40},"saco_15":{"nome":"Saquinho de celofane para 15 cm","cents":80},"saco_7":{"nome":"Saquinho de celofane para mini","cents":50},"fita_cetim":{"nome":"Fita de cetim","cents":60},"fitilho":{"nome":"Fitilho ou laço fino","cents":20},"etiqueta":{"nome":"Etiqueta ou tag","cents":30},"caixa_g":{"nome":"Caixa kraft para 1 chocotone de 500 g","cents":350},"caixa_2m":{"nome":"Caixa kraft para 2 minis","cents":280},"caixa_4m":{"nome":"Caixa kraft para 4 minis","cents":350},"caixa_premium":{"nome":"Caixa presente rígida","cents":800},"cesta":{"nome":"Cesta pequena","cents":900},"palha":{"nome":"Palha ou papel de seda","cents":50},"cartao":{"nome":"Cartão de mensagem","cents":40},"celofane_cesta":{"nome":"Filme de celofane para cesta","cents":150}}
export const EMBALAGEM_TIPO: Record<'G' | 'M', string[]> = {"G":["forma_15","saco_15","fita_cetim","etiqueta","caixa_g"],"M":["forma_7","saco_7","fitilho","etiqueta"]}
export const EMBALAGEM_UN_EXEMPLO: Record<'G' | 'M', number> = {"G":640,"M":140}

export const RECEITAS: ReceitaCusto[] = [
  {"n":1,"nome":"Chocotone Caseiro","secao":"Massas base e variações","unidades":2,"tipo":"G","custeio":{"kind":"completa","itens":[["farinha","200","g"],["agua","150","ml"],["fermento_seco","6","g"],["farinha","300","g"],["agua","50","ml"],["leite_po","25","g"],["gema","4","un"],["manteiga","80","g"],["acucar","80","g"],["sal","1/2","cc"],["limao","1","un"],["laranja","1","un"],["baunilha","1","cs"],["gotas_chocolate","150","g"],["manteiga","1","cc"]]}},
  {"n":2,"nome":"Panetone Tradicional","secao":"Massas base e variações","unidades":2,"tipo":"G","custeio":{"kind":"completa","itens":[["fermento_fresco","15","g"],["agua","1/2","xic"],["farinha","1","xic"],["farinha","5/2","xic"],["acucar","1/2","xic"],["gema","4","un"],["leite","1/3","xic"],["manteiga","75","g"],["sal","1/2","cc"],["limao","1","un"],["laranja","1","un"],["baunilha","1","cs"],["vinho_tinto","1","cs"],["frutas_cristalizadas","1","xic"],["passas","2/3","xic"],["manteiga","1","cc"]]}},
  {"n":3,"nome":"Chocotone de Chocolate Branco","secao":"Massas base e variações","unidades":2,"tipo":"G","custeio":{"kind":"variacao","base":1,"remove":[["gotas_chocolate","150","g"]],"add":[["gotas_chocolate_branco","150","g"]]}},
  {"n":4,"nome":"Chocotone Dois Chocolates","secao":"Massas base e variações","unidades":2,"tipo":"G","custeio":{"kind":"variacao","base":1,"remove":[["gotas_chocolate","150","g"]],"add":[["gotas_chocolate","75","g"],["gotas_chocolate_branco","75","g"]]}},
  {"n":5,"nome":"Chocotone com Creme de Avelã","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["creme_avela","150","g"]]}},
  {"n":6,"nome":"Panetone com Doce de Leite e Nozes","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["doce_leite","150","g"],["nozes","25","g"]]}},
  {"n":7,"nome":"Chocotone com Coco","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_coco","150","g"],["coco_ralado","15","g"]]}},
  {"n":8,"nome":"Chocotone com Pistache","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_pistache","150","g"],["pistache","15","g"]]}},
  {"n":9,"nome":"Chocotone Crocante de Amendoim","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["amendoim","25","g"]]}},
  {"n":10,"nome":"Chocotone com Cobertura Marmorizada","secao":"Especiais","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","80","g"],["cobertura_branca","20","g"]]}},
  {"n":11,"nome":"Chocotone Recheado de Brigadeiro","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_brigadeiro","150","g"]]}},
  {"n":12,"nome":"Chocotone Recheado de Leite em Pó","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_leite_po","150","g"]]}},
  {"n":13,"nome":"Chocotone Recheado de Ganache Meio Amargo","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["ganache_meio_amargo","150","g"]]}},
  {"n":14,"nome":"Chocotone Recheado de Chocolate Branco","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_branco","150","g"]]}},
  {"n":15,"nome":"Chocotone Recheado de Maracujá","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_maracuja","150","g"]]}},
  {"n":16,"nome":"Chocotone Recheado de Limão","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_limao","150","g"]]}},
  {"n":17,"nome":"Chocotone Recheado de Frutas Vermelhas","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_frutas_vermelhas","150","g"]]}},
  {"n":18,"nome":"Chocotone Recheado de Caramelo Salgado","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_caramelo_salgado","150","g"]]}},
  {"n":19,"nome":"Chocotone Recheado de Café","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_cafe","150","g"]]}},
  {"n":20,"nome":"Chocotone Recheado de Doce de Leite","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["doce_leite","150","g"]]}},
  {"n":21,"nome":"Chocotone Recheado de Abóbora","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["doce_abobora","150","g"]]}},
  {"n":22,"nome":"Chocotone Recheado de Goiabada Cremosa","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["goiabada_cremosa","150","g"]]}},
  {"n":23,"nome":"Chocotone Recheado de Damasco","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_damasco","150","g"]]}},
  {"n":24,"nome":"Chocotone Recheado de Ameixa","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_ameixa","150","g"]]}},
  {"n":25,"nome":"Chocotone Recheado de Chocolate com Laranja","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_laranja","150","g"]]}},
  {"n":26,"nome":"Chocotone Recheado de Chocolate com Menta","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_menta","150","g"]]}},
  {"n":27,"nome":"Chocotone Recheado de Castanha-de-Caju","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_castanha_caju","150","g"]]}},
  {"n":28,"nome":"Chocotone Recheado de Amendoim","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_amendoim","150","g"]]}},
  {"n":29,"nome":"Chocotone Recheado de Baunilha","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_baunilha","150","g"]]}},
  {"n":30,"nome":"Chocotone Recheado de Canela","secao":"Chocotones recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_canela","150","g"]]}},
  {"n":31,"nome":"Minichocotone na Air Fryer","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"completa","itens":[["farinha","1/3","xic"],["agua","1/4","xic"],["fermento_seco","5","g"],["farinha","3/2","xic"],["acucar","1/3","xic"],["manteiga","40","g"],["gema","2","un"],["laranja","1","un"],["agua","1/4","xic"],["baunilha","1/2","cc"],["sal","1/2","cc"],["gotas_chocolate","130","g"],["manteiga","5/2","cc"]]}},
  {"n":32,"nome":"Minichocotone Recheado de Brigadeiro","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_brigadeiro","150","g"]]}},
  {"n":33,"nome":"Minichocotone Recheado de Leite em Pó","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_leite_po","150","g"]]}},
  {"n":34,"nome":"Minichocotone Recheado de Ganache Meio Amargo","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["ganache_meio_amargo","150","g"]]}},
  {"n":35,"nome":"Minichocotone Recheado de Chocolate Branco","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_choc_branco","150","g"]]}},
  {"n":36,"nome":"Minichocotone Recheado de Maracujá","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_maracuja","150","g"]]}},
  {"n":37,"nome":"Minichocotone Recheado de Limão","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_limao","150","g"]]}},
  {"n":38,"nome":"Minichocotone Recheado de Frutas Vermelhas","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_frutas_vermelhas","150","g"]]}},
  {"n":39,"nome":"Minichocotone Recheado de Caramelo Salgado","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_caramelo_salgado","150","g"]]}},
  {"n":40,"nome":"Minichocotone Recheado de Café","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_cafe","150","g"]]}},
  {"n":41,"nome":"Minichocotone Recheado de Doce de Leite","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["doce_leite","150","g"]]}},
  {"n":42,"nome":"Minichocotone Recheado de Abóbora","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_abobora","150","g"]]}},
  {"n":43,"nome":"Minichocotone Recheado de Goiabada Cremosa","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_goiabada","150","g"]]}},
  {"n":44,"nome":"Minichocotone Recheado de Damasco","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_damasco","150","g"]]}},
  {"n":45,"nome":"Minichocotone Recheado de Ameixa","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_ameixa","150","g"]]}},
  {"n":46,"nome":"Minichocotone Recheado de Chocolate com Laranja","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_choc_laranja","150","g"]]}},
  {"n":47,"nome":"Minichocotone Recheado de Chocolate com Menta","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_choc_menta","150","g"]]}},
  {"n":48,"nome":"Minichocotone Recheado de Castanha-de-Caju","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_castanha_caju","150","g"]]}},
  {"n":49,"nome":"Minichocotone Recheado de Amendoim","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_amendoim","150","g"]]}},
  {"n":50,"nome":"Minichocotone Recheado de Baunilha","secao":"Minichocotones na Air Fryer","unidades":5,"tipo":"M","custeio":{"kind":"montagem","base":31,"baseUn":5,"add":[["recheio_baunilha","150","g"]]}},
  {"n":51,"nome":"Chocotone com Chocolate Branco e Coco","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["coco_ralado","15","g"]]}},
  {"n":52,"nome":"Chocotone com Chocolate Meio Amargo e Amêndoas","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["amendoa_laminada","20","g"]]}},
  {"n":53,"nome":"Chocotone com Chocolate ao Leite e Avelãs","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["avela","20","g"]]}},
  {"n":54,"nome":"Chocotone com Chocolate Branco e Pistache","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["pistache","15","g"]]}},
  {"n":55,"nome":"Chocotone com Chocolate Meio Amargo e Nozes","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["nozes","20","g"]]}},
  {"n":56,"nome":"Chocotone com Chocolate ao Leite e Castanha-de-Caju","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["castanha_caju","20","g"]]}},
  {"n":57,"nome":"Chocotone com Chocolate Branco e Damasco","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["damasco_seco","20","g"]]}},
  {"n":58,"nome":"Chocotone com Chocolate Meio Amargo e Coco","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["coco_ralado","15","g"]]}},
  {"n":59,"nome":"Chocotone com Chocolate ao Leite e Biscoito","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["biscoito_maisena","20","g"]]}},
  {"n":60,"nome":"Chocotone com Chocolate Branco e Passas","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["uva_passa","20","g"]]}},
  {"n":61,"nome":"Chocotone com Chocolate Meio Amargo e Nibs","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["nibs_cacau","10","g"]]}},
  {"n":62,"nome":"Chocotone com Chocolate ao Leite e Paçoca","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["pacoca","20","g"]]}},
  {"n":63,"nome":"Chocotone com Chocolate Branco e Nozes","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["nozes","20","g"]]}},
  {"n":64,"nome":"Chocotone com Chocolate Meio Amargo e Avelãs","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["avela","20","g"]]}},
  {"n":65,"nome":"Chocotone com Chocolate ao Leite e Amêndoas","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["amendoa_laminada","20","g"]]}},
  {"n":66,"nome":"Chocotone com Chocolate Branco e Amendoim","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["amendoim","20","g"]]}},
  {"n":67,"nome":"Chocotone com Chocolate Meio Amargo e Damasco","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["damasco_seco","20","g"]]}},
  {"n":68,"nome":"Chocotone com Chocolate ao Leite e Coco","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_ao_leite","100","g"],["coco_ralado","15","g"]]}},
  {"n":69,"nome":"Chocotone com Chocolate Branco e Castanha-de-Caju","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_branca","100","g"],["castanha_caju","20","g"]]}},
  {"n":70,"nome":"Chocotone com Chocolate Meio Amargo e Biscoito","secao":"Chocotones com cobertura","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["cobertura_meio_amargo","100","g"],["biscoito_maisena","20","g"]]}},
  {"n":71,"nome":"Chocotone em Camadas de Brigadeiro e Leite em Pó","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_brigadeiro","75","g"],["recheio_leite_po","75","g"]]}},
  {"n":72,"nome":"Chocotone em Camadas de Brigadeiro e Maracujá","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_brigadeiro","75","g"],["recheio_maracuja","75","g"]]}},
  {"n":73,"nome":"Chocotone em Camadas de Brigadeiro e Frutas Vermelhas","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_brigadeiro","75","g"],["recheio_frutas_vermelhas","75","g"]]}},
  {"n":74,"nome":"Chocotone em Camadas de Brigadeiro e Doce de Leite","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_brigadeiro","75","g"],["doce_leite","75","g"]]}},
  {"n":75,"nome":"Chocotone em Camadas de Leite em Pó e Maracujá","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_leite_po","75","g"],["recheio_maracuja","75","g"]]}},
  {"n":76,"nome":"Chocotone em Camadas de Leite em Pó e Frutas Vermelhas","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_leite_po","75","g"],["recheio_frutas_vermelhas","75","g"]]}},
  {"n":77,"nome":"Chocotone em Camadas de Leite em Pó e Goiabada Cremosa","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_leite_po","75","g"],["recheio_goiabada","75","g"]]}},
  {"n":78,"nome":"Chocotone em Camadas de Leite em Pó e Chocolate com Laranja","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_leite_po","75","g"],["recheio_choc_laranja","75","g"]]}},
  {"n":79,"nome":"Chocotone em Camadas de Ganache Meio Amargo e Maracujá","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["ganache_meio_amargo","75","g"],["recheio_maracuja","75","g"]]}},
  {"n":80,"nome":"Chocotone em Camadas de Ganache Meio Amargo e Frutas Vermelhas","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["ganache_meio_amargo","75","g"],["recheio_frutas_vermelhas","75","g"]]}},
  {"n":81,"nome":"Chocotone em Camadas de Ganache Meio Amargo e Doce de Leite","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["ganache_meio_amargo","75","g"],["doce_leite","75","g"]]}},
  {"n":82,"nome":"Chocotone em Camadas de Ganache Meio Amargo e Ameixa","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["ganache_meio_amargo","75","g"],["recheio_ameixa","75","g"]]}},
  {"n":83,"nome":"Chocotone em Camadas de Chocolate Branco e Maracujá","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_branco","75","g"],["recheio_maracuja","75","g"]]}},
  {"n":84,"nome":"Chocotone em Camadas de Chocolate Branco e Frutas Vermelhas","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_branco","75","g"],["recheio_frutas_vermelhas","75","g"]]}},
  {"n":85,"nome":"Chocotone em Camadas de Chocolate Branco e Damasco","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_branco","75","g"],["recheio_damasco","75","g"]]}},
  {"n":86,"nome":"Chocotone em Camadas de Chocolate Branco e Amendoim","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_choc_branco","75","g"],["recheio_amendoim","75","g"]]}},
  {"n":87,"nome":"Chocotone em Camadas de Café e Doce de Leite","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_cafe","75","g"],["doce_leite","75","g"]]}},
  {"n":88,"nome":"Chocotone em Camadas de Doce de Leite e Ameixa","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["doce_leite","75","g"],["recheio_ameixa","75","g"]]}},
  {"n":89,"nome":"Chocotone em Camadas de Abóbora e Baunilha","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_abobora","75","g"],["recheio_baunilha","75","g"]]}},
  {"n":90,"nome":"Chocotone em Camadas de Damasco e Baunilha","secao":"Chocotones em camadas","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":1,"baseUn":1,"add":[["recheio_damasco","75","g"],["recheio_baunilha","75","g"]]}},
  {"n":91,"nome":"Panetone de Frutas com Brigadeiro","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_brigadeiro","150","g"]]}},
  {"n":92,"nome":"Panetone de Frutas com Leite em Pó","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_leite_po","150","g"]]}},
  {"n":93,"nome":"Panetone de Frutas com Ganache Meio Amargo","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["ganache_meio_amargo","150","g"]]}},
  {"n":94,"nome":"Panetone de Frutas com Chocolate Branco","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_choc_branco","150","g"]]}},
  {"n":95,"nome":"Panetone de Frutas com Maracujá","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_maracuja","150","g"]]}},
  {"n":96,"nome":"Panetone de Frutas com Limão","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_limao","150","g"]]}},
  {"n":97,"nome":"Panetone de Frutas com Frutas Vermelhas","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_frutas_vermelhas","150","g"]]}},
  {"n":98,"nome":"Panetone de Frutas com Caramelo Salgado","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_caramelo_salgado","150","g"]]}},
  {"n":99,"nome":"Panetone de Frutas com Café","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["recheio_cafe","150","g"]]}},
  {"n":100,"nome":"Panetone de Frutas com Doce de Leite","secao":"Panetones de frutas recheados","unidades":1,"tipo":"G","custeio":{"kind":"montagem","base":2,"baseUn":1,"add":[["doce_leite","150","g"]]}},
]
