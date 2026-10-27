# COMUNICAÇÃO DAS OFERTAS (app da Fábrica de Panetones)

Gerado por `npm run comunicacao:gen` a partir de `shared/catalog.ts`. **Os textos moram só no catálogo** (`COPY`, `OFFER_COPY`, `COLLECTION_COPY`, `HOOKS`, `offerContextFor`); o app e este documento leem de lá, sem duplicar. Para mudar uma frase, edite o catálogo e rode o gerador.

## 1. Princípios

- Ordem de cada card e de cada detalhe: **situação da cozinha, pergunta ou necessidade, como ajuda, e só depois o preço**. O preço é discreto na lista e claro no detalhe e no checkout.
- Áreas chamadas de **Biblioteca**, **Seu caminho** e **Para você**. Nada de "compre", "oferta" ou "desconto" em destaque.
- Convite suave: "Ver como ajuda" nos cards e na lista (leva ao detalhe, nunca direto ao checkout). No detalhe, "Quero isso · R$ preço" leva ao checkout. Botões continuam verdes.
- Honestidade: sem depoimento inventado, sem estatística ("90% das alunas"), sem escassez nem relógio falso, sem promessa de renda. "O próximo passo natural depois do Vulcão" é sugestão de caminho, não número.
- Contexto vem de dados reais do app: "Fiz essa", "Marcar como visto", itens que a pessoa já tem (progresso da trilha). Sem contexto, vale a frase de necessidade da oferta.
- Pendente não libera, pago libera uma vez, estorno revoga (regras do ANEXO-LEVI.md não mudaram).

## 2. Navegação, seções e botões

| Onde | Texto |
|---|---|
| Navegação inferior | Início / Biblioteca / Seu caminho / Conta |
| Título da área | Biblioteca |
| Texto de abertura | Materiais para o seu próximo passo na cozinha. Você escolhe quando. Nada é cobrado ao abrir. |
| Seção "para você" | Para você |
| Seção das coleções | Para o seu caminho |
| Texto das coleções | Materiais que andam juntos. Pegue um por um ou a coleção inteira, como fizer mais sentido. |
| Lista completa | Todos os materiais |
| Texto da lista | A biblioteca inteira, na ordem em que costuma fazer sentido. |
| Fichas de Socorro (seção) | Para quando a massa não crescer |
| Texto da seção | Se o panetone murchou, solou ou o recheio desandou, comece por aqui. |
| Produtos que a pessoa já tem | Meus produtos |
| Botão do card e da lista | **Ver como ajuda** (leva ao detalhe) |
| Botão do detalhe | **Quero isso** + preço (leva ao checkout) |
| Botão da coleção | Quero esta coleção |
| Botão da biblioteca completa | Quero a biblioteca completa / Ver a biblioteca completa |
| Item que a pessoa já tem | Acessar |
| Ainda sem checkout pronto | Disponível em breve + Quero ser avisada (depois: Anotado ✓ Avisamos você) |
| Notas de preço | pagamento único / preço previsto / valor somado dos itens (soma riscada só no detalhe) |
| Rótulo de sugestão de caminho | O próximo passo natural |

## 3. Contexto do card (o que a pessoa acabou de fazer)

Prioridade: fez algo relacionado, trilha em andamento, marcou algo como visto, sem contexto.

| Situação | Rótulo (exemplo) |
|---|---|
| Fiz essa | Você marcou “Fábrica de Panetones Caseiros” como feita |
| Trilha em andamento | Sua trilha “Panetone de confeitaria”: 1 de 4 (texto: o gancho do passo seguinte, ver seção 4) |
| Marcou como visto | Você marcou “Cardápio e Fotos” como visto |
| Coleção em andamento | Você já tem 1 de 3 desta coleção |
| Sem contexto | frase de necessidade da oferta (seção 5) |

## 4. Ganchos de caminho (sugestão, não estatística)

| De | Para | Tipo | Texto |
|---|---|---|---|
| panetones-vulcao | segredo-recheios | track | O próximo passo natural depois do Vulcão: entender o recheio por dentro, para ele não desandar. |
| segredo-recheios | panetones-vitrine | track | Recheio no ponto combina com um acabamento à altura, e uma foto que mostre isso. |
| panetones-vitrine | mini-panetones | track | Com o panetone bonito pronto, o próximo passo natural é a versão pequena, que dá para presentear. |
| panetones-vitrine | ceia-doce | bridge | Se a mesa vai ser a sua vitrine, os doces da Ceia Doce combinam com ela. |
| mini-panetones | caixas-doces-natal | bridge | Mini panetones prontos pedem uma caixa de presente. As Caixas de Doces ajudam a montar. |
| sobremesas-natal | ceia-doce | track | Se a mesa de Natal pede mais variedade, sem panetone, este é o próximo passo. |
| ceia-doce | rabanada-padaria | track | Para fechar a mesa: a rabanada, que dá sensação de ceia completa. |
| receitas-explodir-vendas | caixas-doces-natal | track | Com as receitas do mês escolhidas, o próximo passo é pensar na caixa de presente. |
| caixas-doces-natal | doces-para-revender | track | Caixa montada? Falta contar para as pessoas. Aqui estão as artes e os textos para isso. |
| mesa-doce-ano-novo | janeiro-panetone | track | Passou a virada? Janeiro também pode ter panetone. |
| janeiro-panetone | fornada-pascoa | track | A próxima estação é a Páscoa. |
| fornada-pascoa | ano-inteiro-encomendas | track | Para fechar o ano: o pacote com tudo. |

Trilhas: Panetone de confeitaria (panetones-vulcao > segredo-recheios > panetones-vitrine > mini-panetones); Ceia completa (sobremesas-natal > ceia-doce > rabanada-padaria); Encomendas de dezembro (receitas-explodir-vendas > caixas-doces-natal > doces-para-revender); Natal e Ano Novo (mesa-doce-ano-novo > janeiro-panetone > fornada-pascoa > ano-inteiro-encomendas).

## 5. Texto de cada oferta (17)

Para cada uma: necessidade (card sem contexto), como ajuda (segunda linha), pergunta da cozinha (abre o detalhe), contexto depois de "Fiz essa", contexto depois de "visto", e o convite.

### Panetones Vulcão: 15 Receitas de Dar Água na Boca (`panetones-vulcao`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando você quer um panetone que faça todo mundo parar para olhar.
- **Como ajuda (card):** Recheio e cobertura que escorrem, com a montagem explicada para dar certo na sua cozinha.
- **Pergunta da cozinha (detalhe):** Já viu aquele panetone com o recheio escorrendo e pensou: como será que fazem?
- **Relacionados (dão contexto):** main, bonus-06
- **Depois de "Fiz essa":** O próximo passo é dar ao seu panetone o recheio que escorre.
- **Depois de marcar como visto:** Se o panetone básico já está na sua mão, o Vulcão mostra como montar o recheio que escorre.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,90"

### Panetones de Vitrine: 25 Acabamentos de Luxo + Fotos que Dão Vontade (`panetones-vitrine`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando o panetone já sai bom, mas você quer que ele fique bonito na foto e na mesa.
- **Como ajuda (card):** Acabamentos para o panetone ficar com cara de vitrine, e o jeito de fotografar.
- **Pergunta da cozinha (detalhe):** Seu panetone cresce bem, mas na hora de mostrar parece comum?
- **Relacionados (dão contexto):** main, bonus-03, bonus-01
- **Depois de "Fiz essa":** O próximo passo é caprichar no acabamento e na foto.
- **Depois de marcar como visto:** Se você está olhando o cardápio e as fotos, aqui estão acabamentos para o panetone ter o que mostrar.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,90"

### Caixas de Doces de Natal: 30 brigadeiros e trufas gourmet que viram presente (`caixas-doces-natal`, R$ 37,00)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer algo bonito para acompanhar o panetone na caixa.
- **Como ajuda (card):** Brigadeiros e trufas gourmet para montar caixas de presente.
- **Pergunta da cozinha (detalhe):** Quando alguém pede um presente, o que vai na caixa junto com o panetone?
- **Relacionados (dão contexto):** bonus-01, bonus-02
- **Depois de "Fiz essa":** O próximo passo é pensar no que vai dentro da caixa.
- **Depois de marcar como visto:** Se você olhou embalagem e kits, aqui estão os doces que completam a caixa.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,00"

### O Segredo dos Recheios que Fazem Qualquer Panetone Parecer de Confeitaria (`segredo-recheios`, R$ 37,90)

- **Necessidade (sem contexto):** Para quando o recheio desanda, vaza ou fica sem graça.
- **Como ajuda (card):** A técnica por trás de cada recheio, para ele ficar no ponto e dar certo toda vez.
- **Pergunta da cozinha (detalhe):** O recheio escorreu para o fundo ou ficou seco demais? Acontece com quase todo mundo no começo.
- **Relacionados (dão contexto):** main, bonus-06, panetones-vulcao
- **Depois de "Fiz essa":** O próximo passo é entender o recheio por dentro, para ele não desandar.
- **Depois de marcar como visto:** Se o recheio é a parte que mais te preocupa, esta é a técnica que sustenta todos eles.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,90"

### 15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro (`receitas-explodir-vendas`, R$ 47,00)

- **Necessidade (sem contexto):** Para quando dezembro está chegando e você ainda não sabe o que vai fazer.
- **Como ajuda (card):** Receitas pensadas para o movimento de fim de ano, para você decidir o cardápio com calma.
- **Pergunta da cozinha (detalhe):** Já sabe o que vai oferecer em dezembro, ou ainda está decidindo?
- **Relacionados (dão contexto):** bonus-08, bonus-05, bonus-03
- **Depois de "Fiz essa":** O próximo passo é escolher as receitas que vão entrar no seu cardápio.
- **Depois de marcar como visto:** Se você está montando o cardápio ou o planejamento, estas receitas ajudam a decidir.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 47,00"

### 20 Sobremesas de Natal com Panetone (`sobremesas-natal`, R$ 37,00)

- **Necessidade (sem contexto):** Antes da ceia de Natal, você vai querer sobremesas que usam o panetone que já sabe fazer.
- **Como ajuda (card):** Sobremesas de Natal com panetone, para variar a mesa sem aprender tudo do zero.
- **Pergunta da cozinha (detalhe):** Sobrou panetone, ou você quer uma sobremesa que não pareça repetida na mesa?
- **Relacionados (dão contexto):** main, bonus-08
- **Depois de "Fiz essa":** O próximo passo é levar o panetone para além da fatia.
- **Depois de marcar como visto:** Se você olhou as receitas de Natal, aqui estão sobremesas que usam o panetone.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,00"

### Ceia Doce: 25 sobremesas de Natal e Ano Novo, sem panetone (`ceia-doce`, R$ 27,00)

- **Necessidade (sem contexto):** Para quando a mesa de Natal pede mais variedade, e nem tudo precisa ser panetone.
- **Como ajuda (card):** Sobremesas de Natal e Ano Novo para completar a mesa.
- **Pergunta da cozinha (detalhe):** A ceia está quase pronta, mas faltam sobremesas além do panetone?
- **Relacionados (dão contexto):** bonus-08, sobremesas-natal, panetones-vitrine
- **Depois de "Fiz essa":** O próximo passo é pensar na mesa inteira, não só no panetone.
- **Depois de marcar como visto:** Se o cardápio de Natal está tomando forma, estas sobremesas completam a mesa.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,00"

### Mini Panetones: Pequenos no Tamanho, Gigantes no Desejo (`mini-panetones`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando você quer presentear, ou vender, em um tamanho pequeno.
- **Como ajuda (card):** Panetones pequenos, que cabem na caixa e na lembrancinha.
- **Pergunta da cozinha (detalhe):** Precisa de algo menor, que dê para entregar sem cortar uma fatia?
- **Relacionados (dão contexto):** bonus-01, bonus-02, panetones-vitrine
- **Depois de "Fiz essa":** O próximo passo é a versão pequena, que dá para presentear.
- **Depois de marcar como visto:** Se você olhou embalagem e kits, os minis cabem direto nas ideias que viu.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,90"

### Rabanada de Padaria: 12 versões (`rabanada-padaria`, R$ 24,90)

- **Necessidade (sem contexto):** Antes da ceia de Natal, você vai querer a rabanada que dá sensação de mesa completa.
- **Como ajuda (card):** 12 versões de rabanada de padaria, da clássica às recheadas.
- **Pergunta da cozinha (detalhe):** Falta aquele doce quentinho que lembra a casa da família?
- **Relacionados (dão contexto):** ceia-doce, sobremesas-natal, main
- **Depois de "Fiz essa":** O próximo passo é fechar a mesa com a rabanada.
- **Depois de marcar como visto:** Se a mesa de Natal está sendo montada, a rabanada costuma ser o doce que lembram de pedir.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 24,90"

### Doces de Natal para Revender: pacote Caixas + Lembrancinhas (`doces-para-revender`, R$ 47,00)

- **Necessidade (sem contexto):** Para quando você quer oferecer os doces para outras pessoas, sem inventar tudo do zero.
- **Como ajuda (card):** Pacote de caixas e lembrancinhas, com o que precisa para oferecer e organizar.
- **Pergunta da cozinha (detalhe):** Já tem a caixa pronta, mas falta o jeito de oferecer para quem não conhece o seu trabalho?
- **Relacionados (dão contexto):** caixas-doces-natal, bonus-04, bonus-03
- **Depois de "Fiz essa":** O próximo passo é contar para as pessoas o que você faz.
- **Depois de marcar como visto:** Se você olhou mensagens e cardápio, aqui estão caixas e lembrancinhas para oferecer.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 47,00"

### Kit de Presente Gourmet: Cesta de Natal Caseira (`cesta-natal-caseira`, R$ 37,00)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer uma cesta pronta para dar de presente, feita em casa.
- **Como ajuda (card):** Uma cesta de Natal caseira, com o que montar e como apresentar.
- **Pergunta da cozinha (detalhe):** Quer presentear alguém com algo feito por você, mas não sabe o que juntar na cesta?
- **Relacionados (dão contexto):** bonus-02, bonus-01, caixas-doces-natal
- **Depois de "Fiz essa":** O próximo passo é montar uma cesta inteira.
- **Depois de marcar como visto:** Se os kits de Natal te chamaram a atenção, aqui está uma cesta para montar em casa.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,00"

### Biscoitos de Natal Decorados: do cortador ao saquinho (`biscoitos-natal-decorados`, R$ 37,00)

- **Necessidade (sem contexto):** Para quando você quer biscoitos bonitos de Natal, sem passar a noite decorando.
- **Como ajuda (card):** Do cortador ao saquinho: biscoitos decorados com passo a passo.
- **Pergunta da cozinha (detalhe):** Quer biscoitos de Natal com cara de loja, mas tem receio da decoração?
- **Relacionados (dão contexto):** bonus-02, bonus-01
- **Depois de "Fiz essa":** O próximo passo é ocupar o forno com algo além do panetone.
- **Depois de marcar como visto:** Se você olhou os kits de Natal, os biscoitos decorados entram bem em qualquer um.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,00"

### Dia de Produção em Escala: planilha e passo a passo (`dia-producao-escala`, R$ 37,00)

- **Necessidade (sem contexto):** Para quando as encomendas passam de uma e a cozinha começa a ficar apertada.
- **Como ajuda (card):** Planilha e passo a passo para organizar um dia de produção.
- **Pergunta da cozinha (detalhe):** Quando chegam várias encomendas, você sabe o que fazer primeiro?
- **Relacionados (dão contexto):** bonus-05, bonus-07
- **Depois de "Fiz essa":** O próximo passo é organizar o dia da produção.
- **Depois de marcar como visto:** Se você olhou o planejador ou a tabela de custos, aqui está o dia de produção, passo a passo.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 37,00"

### Mesa Doce de Ano Novo: sobremesas para a virada (`mesa-doce-ano-novo`, R$ 27,00)

- **Necessidade (sem contexto):** Depois do Natal, a virada também pede mesa doce.
- **Como ajuda (card):** Sobremesas para a virada, para aproveitar o que você já sabe fazer.
- **Pergunta da cozinha (detalhe):** O Natal passou. E a mesa da virada, já está pensada?
- **Relacionados (dão contexto):** ceia-doce, sobremesas-natal
- **Depois de "Fiz essa":** O próximo passo é pensar na mesa da virada.
- **Depois de marcar como visto:** Se você já olhou as sobremesas de Natal, a virada pode ter as suas também.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,00"

### Chocotone e Panetone de Colher: 12 sobremesas instantâneas (`chocotone-colher`, R$ 24,90)

- **Necessidade (sem contexto):** Para quando você quer uma sobremesa de panetone que fica pronta sem forno.
- **Como ajuda (card):** 12 sobremesas de chocotone e panetone de colher, de preparo rápido.
- **Pergunta da cozinha (detalhe):** Visita chegando e pouco tempo? Dá para servir uma sobremesa de panetone sem assar?
- **Relacionados (dão contexto):** main, bonus-06
- **Depois de "Fiz essa":** O próximo passo é uma sobremesa de panetone que não pede forno.
- **Depois de marcar como visto:** Se o Plano B já te interessou, estas sobremesas seguem a mesma ideia: rápidas.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 24,90"

### Natal das Crianças: 20 Panetones que Viram Presentes Irresistíveis (`natal-criancas`, R$ 24,90)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer algo que as crianças da família reconheçam e peçam.
- **Como ajuda (card):** 20 panetones pensados para as crianças, com ideias de apresentação.
- **Pergunta da cozinha (detalhe):** As crianças da casa já pediram o que querem encontrar na mesa de Natal?
- **Relacionados (dão contexto):** bonus-02, mini-panetones
- **Depois de "Fiz essa":** O próximo passo é fazer um panetone para o gosto dos pequenos.
- **Depois de marcar como visto:** Se você olhou os kits e a versão mini, aqui estão panetones para as crianças.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 24,90"

### Janeiro Também Tem Panetone: 15 Sabores para Além do Natal (`janeiro-panetone`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando o Natal passou e você ainda tem vontade de fazer panetone.
- **Como ajuda (card):** 15 sabores para fazer panetone fora do Natal.
- **Pergunta da cozinha (detalhe):** Passou o Natal. Dá para continuar fazendo panetone em janeiro?
- **Relacionados (dão contexto):** mesa-doce-ano-novo, main
- **Depois de "Fiz essa":** O próximo passo é mostrar que panetone também serve para janeiro.
- **Depois de marcar como visto:** Se você já olhou a mesa da virada, aqui está o que vem depois.
- **Convite:** card/lista "Ver como ajuda"; detalhe "Quero isso · R$ 27,90"

### Fichas de Socorro (order bump, R$ 7,90)

- **Necessidade:** Para quando a massa não crescer, o panetone murchar ou o recheio desandar.
- **Como ajuda (card):** Ache o problema pelo que você está vendo, saiba se ainda dá para salvar e o que mudar na próxima fornada.
- **Pergunta da cozinha:** A massa não cresceu, o panetone murchou ou ficou duro. E agora?
- **Depois de "Fiz essa":** Fez a receita e ela não saiu como você esperava? As fichas ajudam a entender o que aconteceu.
- **Depois de marcar como visto:** Se a massa deu trabalho, as fichas mostram por onde começar a corrigir.

## 6. Coleções

| Coleção | Itens | Valor somado dos itens | Preço | Frase de necessidade |
|---|---|---|---|---|
| Primeira Fornada | 2 | R$ 52,80 | R$ 34,00 | Para começar com o pé direito: um panetone de recheio marcante e uma rabanada de padaria. |
| Panetone de Confeitaria | 3 | R$ 93,70 | R$ 60,90 | Para quando você quer o panetone com cara de confeitaria, do recheio ao acabamento. |
| Ceia Completa | 3 | R$ 88,90 | R$ 57,90 | Antes da ceia de Natal, a mesa doce pensada do começo ao fim. |
| Presentes que Vendem | 3 | R$ 111,90 | R$ 72,90 | Para quem quer presentear com caixas e minis, e depois contar isso para as pessoas. |
| Encomendas de Dezembro | 3 | R$ 131,00 | R$ 85,00 | Para quando as encomendas começarem a chegar e você quiser tudo no lugar. |

## 7. Biblioteca completa (antes "Leve tudo")

- Título: Biblioteca completa. Necessidade: Para quem já sabe que quer seguir o caminho inteiro, sem escolher item por item.
- Curta: Todos os materiais da biblioteca num só acesso.
- Preço: R$ 97,00; valor somado dos itens (só no detalhe): R$ 557,20.
- Botões: Quero a biblioteca completa, Ver a biblioteca completa, "Ver os 17 materiais", roleta "Girar a roleta". Nota da roleta: Todas as fatias levam ao mesmo valor.

## 8. Estilo de referência

Inspiração visual: a página pública https://fabricadepanetones.vercel.app/ (que o Levi acha bonita). HTML, CSS e JS foram baixados com curl e a página foi fotografada em 390x844 para comparar. **Só o estilo foi usado: nenhum texto e nenhuma imagem da página foi copiado.**

**Paleta extraída (tokens em `src/index.css`, bloco "VISUAL v4")**

| Token | Cor | Uso |
|---|---|---|
| `--bg` | #FFFBF8 | fundo creme |
| `--bg-alt` | #FDF1EE | faixas alternadas |
| `--text` (ink) | #24170F | texto |
| `--muted` | #6E625B | texto de apoio (5,9:1 sobre o fundo) |
| `--line` | #EADFDA | bordas de 1px |
| `--accent` (red) | #C1121F | rótulos pequenos, pontinho vermelho |
| `--red-soft` | #F7DCDD | fundo de selo |
| `--green` | #1E9E5A | borda do destaque e detalhes |
| `--ok-soft` (green-soft) | #E6F4EC | fundo suave verde |
| `--gold` | #C9A04F | filete do contexto e destaques |
| `--gold-soft` | #F6EEDC | fundo de selo dourado |
| `--brand` (wine) | #2A1212 | barra do topo |
| `--card` | #FFFFFF | cards |

**Ajustes de acessibilidade em relação à referência** (a referência usa branco sobre #1E9E5A, que dá cerca de 3,4:1, abaixo do mínimo AA): `--open` #17704A com texto branco (6,1:1) para "Acessar"; `--buy` #34B85A com tinta escura #06240F (6,4:1) para "Ver como ajuda" e "Quero isso". Texto dourado em #7A5A18. Os botões principais continuam VERDES.

**Tipografia:** Outfit (família da referência, licença OFL), variável 100-900, subconjunto latino em `public/fonts/outfit-latin-wght.woff2`, `font-display: swap`, fallback "Segoe UI", system-ui. Sem Google Fonts em runtime. A licença está em `public/fonts/Outfit-OFL-LICENSE.txt`. Substituiu a Inter. Pesos: títulos 800, botões 800, selos 700, texto 400/500. Corpo 17px, h1 2,1rem (34 a 36px), título de card 1,5rem, linha 1,55 no texto e 1,08 a 1,2 nos títulos, `text-wrap: balance`.

**Formas e espaçamento:** cards com raio 22px, borda 1px `--line`, sombra mínima `0 6px 16px rgba(42,18,18,.06)`; destaque com borda de 2px verde #1E9E5A; selos e botões em pílula (raio 999px); botão com sombra verde suave `0 8px 18px rgba(30,158,70,.25)` e SEM caixa alta (a referência usa caixa alta; no app o tom é de convite); espaço entre seções de 48px; faixas alternadas em `--bg-alt`; caixa de contexto com filete dourado à esquerda; foco visível em dourado.

**O que não foi copiado:** textos, imagens, ilustrações, estrutura de vendas da página. Também não foi usado nenhum elemento de escassez ou contagem regressiva.

