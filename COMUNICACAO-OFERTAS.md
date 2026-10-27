# COMUNICAÇÃO DAS OFERTAS (app da Fábrica de Panetones)

Gerado por `npm run comunicacao:gen` a partir de `shared/catalog.ts`. **Os textos moram só no catálogo** (`COPY`, `OFFER_COPY`, `COLLECTION_COPY`, `HOOKS`, `offerContextFor`); o app e este documento leem de lá, sem duplicar. Para mudar uma frase, edite o catálogo e rode o gerador.

## 1. Princípios

- Ordem de cada card e de cada detalhe: **situação da cozinha, pergunta ou necessidade, como ajuda, e só depois o preço**. O preço é discreto na lista e claro no detalhe e no checkout.
- Áreas chamadas de **Biblioteca**, **Seu caminho** e **Para você**. Nada de "compre", "oferta" ou "desconto" em destaque.
- Botão verde "Desbloquear por R$ X" (pulso suave, desligado com prefers-reduced-motion) nos cards e no detalhe: abre o checkout direto quando há link e ready:true. O preço fica só no botão na lista, e grande no detalhe. Sem pronto: "Disponível em breve" parado (sem pulso) + "Quero ser avisada". Material pago ainda não adquirido tem cadeado 🔒 na capa ("Bloqueado, desbloqueie para acessar"); quem já tem vê "Acessar" e nenhum cadeado. Nada de contagem regressiva, "últimas" ou urgência.
- Honestidade: sem depoimento inventado, sem estatística ("90% das alunas"), sem escassez nem relógio falso, sem promessa de renda. "O próximo passo natural depois do Vulcão" é sugestão de caminho, não número.
- Contexto vem de dados reais do app: "Fiz essa", "Marcar como visto", itens que a pessoa já tem (progresso da trilha). Sem contexto, vale a frase de necessidade da oferta.
- Pendente não libera, pago libera uma vez, estorno revoga (regras do ANEXO-LEVI.md não mudaram).

## 2. Navegação, seções e botões

| Onde | Texto |
|---|---|
| Navegação inferior | Início / Biblioteca / Seu caminho / Conta |
| Título da área | Biblioteca |
| Texto de abertura | Materiais para o seu próximo passo na cozinha. Você escolhe quando. Nada é cobrado ao abrir. |
| Destaque no topo da lista | Para você |
| Fichas de Socorro (seção) | Para quando a massa não crescer |
| Texto da seção | Se o panetone murchou, solou ou o recheio desandou, comece por aqui. |
| Produtos que a pessoa já tem | Meus produtos |
| Botão do card, da lista e do detalhe (com checkout pronto) | **Desbloquear por R$ X** (abre o checkout; pulso suave) |
| Botão da biblioteca completa | **Desbloquear tudo por R$ 97** |
| Cadeado na capa (material não adquirido) | 🔒 "Bloqueado, desbloqueie para acessar" |
| Link de gancho "próximo passo" | Ver como ajuda: nome do material (leva ao detalhe) |
| Chamada para ver a biblioteca completa | Ver a biblioteca completa |
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
- **Botão:** "Desbloquear por R$ 27,90" (cadeado 🔒 na capa até desbloquear)

### Panetones de Vitrine: 25 Acabamentos de Luxo + Fotos que Dão Vontade (`panetones-vitrine`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando o panetone já sai bom, mas você quer que ele fique bonito na foto e na mesa.
- **Como ajuda (card):** Acabamentos para o panetone ficar com cara de vitrine, e o jeito de fotografar.
- **Pergunta da cozinha (detalhe):** Seu panetone cresce bem, mas na hora de mostrar parece comum?
- **Relacionados (dão contexto):** main, bonus-03, bonus-01
- **Depois de "Fiz essa":** O próximo passo é caprichar no acabamento e na foto.
- **Depois de marcar como visto:** Se você está olhando o cardápio e as fotos, aqui estão acabamentos para o panetone ter o que mostrar.
- **Botão:** "Desbloquear por R$ 27,90" (cadeado 🔒 na capa até desbloquear)

### Caixas de Doces de Natal: 30 brigadeiros e trufas gourmet que viram presente (`caixas-doces-natal`, R$ 37,00)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer algo bonito para acompanhar o panetone na caixa.
- **Como ajuda (card):** Brigadeiros e trufas gourmet para montar caixas de presente.
- **Pergunta da cozinha (detalhe):** Quando alguém pede um presente, o que vai na caixa junto com o panetone?
- **Relacionados (dão contexto):** bonus-01, bonus-02
- **Depois de "Fiz essa":** O próximo passo é pensar no que vai dentro da caixa.
- **Depois de marcar como visto:** Se você olhou embalagem e kits, aqui estão os doces que completam a caixa.
- **Botão:** "Desbloquear por R$ 37" (cadeado 🔒 na capa até desbloquear)

### O Segredo dos Recheios que Fazem Qualquer Panetone Parecer de Confeitaria (`segredo-recheios`, R$ 37,90)

- **Necessidade (sem contexto):** Para quando o recheio desanda, vaza ou fica sem graça.
- **Como ajuda (card):** A técnica por trás de cada recheio, para ele ficar no ponto e dar certo toda vez.
- **Pergunta da cozinha (detalhe):** O recheio escorreu para o fundo ou ficou seco demais? Acontece com quase todo mundo no começo.
- **Relacionados (dão contexto):** main, bonus-06, panetones-vulcao
- **Depois de "Fiz essa":** O próximo passo é entender o recheio por dentro, para ele não desandar.
- **Depois de marcar como visto:** Se o recheio é a parte que mais te preocupa, esta é a técnica que sustenta todos eles.
- **Botão:** "Desbloquear por R$ 37,90" (cadeado 🔒 na capa até desbloquear)

### 15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro (`receitas-explodir-vendas`, R$ 47,00)

- **Necessidade (sem contexto):** Para quando dezembro está chegando e você ainda não sabe o que vai fazer.
- **Como ajuda (card):** Receitas pensadas para o movimento de fim de ano, para você decidir o cardápio com calma.
- **Pergunta da cozinha (detalhe):** Já sabe o que vai oferecer em dezembro, ou ainda está decidindo?
- **Relacionados (dão contexto):** bonus-08, bonus-05, bonus-03
- **Depois de "Fiz essa":** O próximo passo é escolher as receitas que vão entrar no seu cardápio.
- **Depois de marcar como visto:** Se você está montando o cardápio ou o planejamento, estas receitas ajudam a decidir.
- **Botão:** "Desbloquear por R$ 47" (cadeado 🔒 na capa até desbloquear)

### 20 Sobremesas de Natal com Panetone (`sobremesas-natal`, R$ 37,00)

- **Necessidade (sem contexto):** Antes da ceia de Natal, você vai querer sobremesas que usam o panetone que já sabe fazer.
- **Como ajuda (card):** Sobremesas de Natal com panetone, para variar a mesa sem aprender tudo do zero.
- **Pergunta da cozinha (detalhe):** Sobrou panetone, ou você quer uma sobremesa que não pareça repetida na mesa?
- **Relacionados (dão contexto):** main, bonus-08
- **Depois de "Fiz essa":** O próximo passo é levar o panetone para além da fatia.
- **Depois de marcar como visto:** Se você olhou as receitas de Natal, aqui estão sobremesas que usam o panetone.
- **Botão:** "Desbloquear por R$ 37" (cadeado 🔒 na capa até desbloquear)

### Ceia Doce: 25 sobremesas de Natal e Ano Novo, sem panetone (`ceia-doce`, R$ 27,00)

- **Necessidade (sem contexto):** Para quando a mesa de Natal pede mais variedade, e nem tudo precisa ser panetone.
- **Como ajuda (card):** Sobremesas de Natal e Ano Novo para completar a mesa.
- **Pergunta da cozinha (detalhe):** A ceia está quase pronta, mas faltam sobremesas além do panetone?
- **Relacionados (dão contexto):** bonus-08, sobremesas-natal, panetones-vitrine
- **Depois de "Fiz essa":** O próximo passo é pensar na mesa inteira, não só no panetone.
- **Depois de marcar como visto:** Se o cardápio de Natal está tomando forma, estas sobremesas completam a mesa.
- **Botão:** "Desbloquear por R$ 27" (cadeado 🔒 na capa até desbloquear)

### Mini Panetones: Pequenos no Tamanho, Gigantes no Desejo (`mini-panetones`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando você quer presentear, ou vender, em um tamanho pequeno.
- **Como ajuda (card):** Panetones pequenos, que cabem na caixa e na lembrancinha.
- **Pergunta da cozinha (detalhe):** Precisa de algo menor, que dê para entregar sem cortar uma fatia?
- **Relacionados (dão contexto):** bonus-01, bonus-02, panetones-vitrine
- **Depois de "Fiz essa":** O próximo passo é a versão pequena, que dá para presentear.
- **Depois de marcar como visto:** Se você olhou embalagem e kits, os minis cabem direto nas ideias que viu.
- **Botão:** "Desbloquear por R$ 27,90" (cadeado 🔒 na capa até desbloquear)

### Rabanada de Padaria: 12 versões (`rabanada-padaria`, R$ 24,90)

- **Necessidade (sem contexto):** Antes da ceia de Natal, você vai querer a rabanada que dá sensação de mesa completa.
- **Como ajuda (card):** 12 versões de rabanada de padaria, da clássica às recheadas.
- **Pergunta da cozinha (detalhe):** Falta aquele doce quentinho que lembra a casa da família?
- **Relacionados (dão contexto):** ceia-doce, sobremesas-natal, main
- **Depois de "Fiz essa":** O próximo passo é fechar a mesa com a rabanada.
- **Depois de marcar como visto:** Se a mesa de Natal está sendo montada, a rabanada costuma ser o doce que lembram de pedir.
- **Botão:** "Desbloquear por R$ 24,90" (cadeado 🔒 na capa até desbloquear)

### Doces de Natal para Revender: pacote Caixas + Lembrancinhas (`doces-para-revender`, R$ 47,00)

- **Necessidade (sem contexto):** Para quando você quer oferecer os doces para outras pessoas, sem inventar tudo do zero.
- **Como ajuda (card):** Pacote de caixas e lembrancinhas, com o que precisa para oferecer e organizar.
- **Pergunta da cozinha (detalhe):** Já tem a caixa pronta, mas falta o jeito de oferecer para quem não conhece o seu trabalho?
- **Relacionados (dão contexto):** caixas-doces-natal, bonus-04, bonus-03
- **Depois de "Fiz essa":** O próximo passo é contar para as pessoas o que você faz.
- **Depois de marcar como visto:** Se você olhou mensagens e cardápio, aqui estão caixas e lembrancinhas para oferecer.
- **Botão:** "Desbloquear por R$ 47" (cadeado 🔒 na capa até desbloquear)

### Kit de Presente Gourmet: Cesta de Natal Caseira (`cesta-natal-caseira`, R$ 37,00)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer uma cesta pronta para dar de presente, feita em casa.
- **Como ajuda (card):** Uma cesta de Natal caseira, com o que montar e como apresentar.
- **Pergunta da cozinha (detalhe):** Quer presentear alguém com algo feito por você, mas não sabe o que juntar na cesta?
- **Relacionados (dão contexto):** bonus-02, bonus-01, caixas-doces-natal
- **Depois de "Fiz essa":** O próximo passo é montar uma cesta inteira.
- **Depois de marcar como visto:** Se os kits de Natal te chamaram a atenção, aqui está uma cesta para montar em casa.
- **Botão:** "Desbloquear por R$ 37" (cadeado 🔒 na capa até desbloquear)

### Biscoitos de Natal Decorados: do cortador ao saquinho (`biscoitos-natal-decorados`, R$ 37,00)

- **Necessidade (sem contexto):** Para quando você quer biscoitos bonitos de Natal, sem passar a noite decorando.
- **Como ajuda (card):** Do cortador ao saquinho: biscoitos decorados com passo a passo.
- **Pergunta da cozinha (detalhe):** Quer biscoitos de Natal com cara de loja, mas tem receio da decoração?
- **Relacionados (dão contexto):** bonus-02, bonus-01
- **Depois de "Fiz essa":** O próximo passo é ocupar o forno com algo além do panetone.
- **Depois de marcar como visto:** Se você olhou os kits de Natal, os biscoitos decorados entram bem em qualquer um.
- **Botão:** "Desbloquear por R$ 37" (cadeado 🔒 na capa até desbloquear)

### Dia de Produção em Escala: planilha e passo a passo (`dia-producao-escala`, R$ 37,00)

- **Necessidade (sem contexto):** Para quando as encomendas passam de uma e a cozinha começa a ficar apertada.
- **Como ajuda (card):** Planilha e passo a passo para organizar um dia de produção.
- **Pergunta da cozinha (detalhe):** Quando chegam várias encomendas, você sabe o que fazer primeiro?
- **Relacionados (dão contexto):** bonus-05, bonus-07
- **Depois de "Fiz essa":** O próximo passo é organizar o dia da produção.
- **Depois de marcar como visto:** Se você olhou o planejador ou a tabela de custos, aqui está o dia de produção, passo a passo.
- **Botão:** "Desbloquear por R$ 37" (cadeado 🔒 na capa até desbloquear)

### Mesa Doce de Ano Novo: sobremesas para a virada (`mesa-doce-ano-novo`, R$ 27,00)

- **Necessidade (sem contexto):** Depois do Natal, a virada também pede mesa doce.
- **Como ajuda (card):** Sobremesas para a virada, para aproveitar o que você já sabe fazer.
- **Pergunta da cozinha (detalhe):** O Natal passou. E a mesa da virada, já está pensada?
- **Relacionados (dão contexto):** ceia-doce, sobremesas-natal
- **Depois de "Fiz essa":** O próximo passo é pensar na mesa da virada.
- **Depois de marcar como visto:** Se você já olhou as sobremesas de Natal, a virada pode ter as suas também.
- **Botão:** "Desbloquear por R$ 27" (cadeado 🔒 na capa até desbloquear)

### Chocotone e Panetone de Colher: 12 sobremesas instantâneas (`chocotone-colher`, R$ 24,90)

- **Necessidade (sem contexto):** Para quando você quer uma sobremesa de panetone que fica pronta sem forno.
- **Como ajuda (card):** 12 sobremesas de chocotone e panetone de colher, de preparo rápido.
- **Pergunta da cozinha (detalhe):** Visita chegando e pouco tempo? Dá para servir uma sobremesa de panetone sem assar?
- **Relacionados (dão contexto):** main, bonus-06
- **Depois de "Fiz essa":** O próximo passo é uma sobremesa de panetone que não pede forno.
- **Depois de marcar como visto:** Se o Plano B já te interessou, estas sobremesas seguem a mesma ideia: rápidas.
- **Botão:** "Desbloquear por R$ 24,90" (cadeado 🔒 na capa até desbloquear)

### Natal das Crianças: 20 Panetones que Viram Presentes Irresistíveis (`natal-criancas`, R$ 24,90)

- **Necessidade (sem contexto):** Antes do Natal, você vai querer algo que as crianças da família reconheçam e peçam.
- **Como ajuda (card):** 20 panetones pensados para as crianças, com ideias de apresentação.
- **Pergunta da cozinha (detalhe):** As crianças da casa já pediram o que querem encontrar na mesa de Natal?
- **Relacionados (dão contexto):** bonus-02, mini-panetones
- **Depois de "Fiz essa":** O próximo passo é fazer um panetone para o gosto dos pequenos.
- **Depois de marcar como visto:** Se você olhou os kits e a versão mini, aqui estão panetones para as crianças.
- **Botão:** "Desbloquear por R$ 24,90" (cadeado 🔒 na capa até desbloquear)

### Janeiro Também Tem Panetone: 15 Sabores para Além do Natal (`janeiro-panetone`, R$ 27,90)

- **Necessidade (sem contexto):** Para quando o Natal passou e você ainda tem vontade de fazer panetone.
- **Como ajuda (card):** 15 sabores para fazer panetone fora do Natal.
- **Pergunta da cozinha (detalhe):** Passou o Natal. Dá para continuar fazendo panetone em janeiro?
- **Relacionados (dão contexto):** mesa-doce-ano-novo, main
- **Depois de "Fiz essa":** O próximo passo é mostrar que panetone também serve para janeiro.
- **Depois de marcar como visto:** Se você já olhou a mesa da virada, aqui está o que vem depois.
- **Botão:** "Desbloquear por R$ 27,90" (cadeado 🔒 na capa até desbloquear)

### Fichas de Socorro (order bump, R$ 7,90)

- **Necessidade:** Para quando a massa não crescer, o panetone murchar ou o recheio desandar.
- **Como ajuda (card):** Ache o problema pelo que você está vendo, saiba se ainda dá para salvar e o que mudar na próxima fornada.
- **Pergunta da cozinha:** A massa não cresceu, o panetone murchou ou ficou duro. E agora?
- **Depois de "Fiz essa":** Fez a receita e ela não saiu como você esperava? As fichas ajudam a entender o que aconteceu.
- **Depois de marcar como visto:** Se a massa deu trabalho, as fichas mostram por onde começar a corrigir.

## 6. Biblioteca completa (antes "Leve tudo")

- Título: Biblioteca completa. Necessidade: Para quem já sabe que quer seguir o caminho inteiro, sem escolher item por item.
- Curta: Todos os materiais da biblioteca num só acesso.
- Preço: R$ 97,00; valor somado dos itens (só no detalhe): R$ 557,20.
- Botões: Desbloquear tudo por R$ 97, Ver a biblioteca completa, "Ver os 17 materiais", roleta "Girar a roleta". Nota da roleta: Todas as fatias levam ao mesmo valor.

## 7. Estilo de referência

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


## Gamificação: Minha fornada (textos e regras visíveis)

Gerado de `shared/game.ts`. Pontos só por ação que a cliente marca; nada de dinheiro, sorteio, prêmio simulado, punição ou escassez. Dados só no aparelho.

**Avisos honestos fixos:**

- Pontos de Fornada contam o que você marcou como feito. Não valem dinheiro e não são sorteio.
- Extra do app, liberado por progresso. Nada do que você comprou fica trancado.
- Este caderno é só seu. O app não calcula nem promete ganho.
- Suas fotos e anotações ficam no seu aparelho.

**Níveis:** Aprendiz (0 PF), Fornada (100 PF), Confeiteira (300 PF), Mestra do Panetone (700 PF). O nível nunca desce.

**Tabela de PF:** feita 10, refeita 3, casa 5, foto 5, nota 3, ingredientes 2, etapa 15, desafio 20, desafioTodos 30, seq3 10, seq7 25, primeiraEncomenda 10, entregue 5, socorro 5, metaDia 2, sugestao 5, conta 15, presente 10, variedade 10, contaReceita 5, conta5 10. Teto: 60 PF por dia (vale para tudo). Desafios: 3 por semana, 20 PF cada + 30 PF por fechar os 3 (máximo 90 PF por semana).

**Ramos de habilidade:** Massa, Recheio, Cobertura, Embalagem, Venda (3 níveis: Iniciante, Segura, Craque).

**Desafios da semana (lista fixa):**

- Faça uma receita nova
- Tire uma foto da fornada
- Anote como ficou uma fornada
- Use uma Ficha de Socorro e conte se resolveu (só com as Fichas de Socorro)
- Refaça uma receita que você já fez
- Separe os ingredientes antes de começar
- Registre uma encomenda no caderno
- Marque uma receita como favorita
- Cumpra a meta do dia

**Meta do dia (lista fixa):**

- Separe os ingredientes de amanhã
- Leia uma receita até o fim, sem pressa
- Confira se o forno e as formas estão limpos
- Anote uma dúvida que você teve na última fornada
- Pese e separe a farinha de uma receita
- Deixe manteiga e ovos em temperatura ambiente para a próxima fornada
- Escolha a receita da próxima fornada
- Releia uma anotação de uma fornada anterior
- Separe forminhas e embalagens
- Limpe e organize a bancada onde você trabalha

**Selos:**

| Selo | Como ganha |
|---|---|
| Aprendiz | Você começou. Já é um selo. |
| Fornada | Chegue a 100 PF. |
| Confeiteira | Chegue a 300 PF. |
| Mestra do Panetone | Chegue a 700 PF. |
| Três dias na cozinha | Marque algo como feito em 3 dias seguidos (o dia de descanso vale). |
| Semana na cozinha | Chegue a 7 dias de sequência. |
| Primeiro desafio | Conclua um desafio da semana. |
| Semana completa | Conclua os 3 desafios de uma semana. |
| Salvei a fornada: Massa que não cresce | Use uma Ficha de Socorro e marque "Resolveu". |
| Salvei a fornada: Recheio que escorre | Use uma Ficha de Socorro e marque "Resolveu". |
| Salvei a fornada: Panetone que afundou | Use uma Ficha de Socorro e marque "Resolveu". |
| Salvei a fornada: Cobertura que rachou | Use uma Ficha de Socorro e marque "Resolveu". |
| Salvei a fornada: Miolo seco | Use uma Ficha de Socorro e marque "Resolveu". |
| Minha primeira encomenda | Registre a primeira encomenda no caderno. |
| Fiz minha conta | Marque no Bônus 07 que você calculou o custo da sua fornada. |
| Conta de 5 receitas | Termine a conta de 5 receitas diferentes na Conta da Fornada. |
| Fornada de presente | Marque uma fornada que você fez para presentear. |
| Variedade: 3 tipos | Faça materiais de 3 categorias diferentes. |
| Variedade: 5 tipos | Faça materiais de 5 categorias diferentes. |
| Variedade: 8 tipos | Faça materiais de 8 categorias diferentes. |
| (um por receita) | Toque em "Fiz essa" no material |
| Receita de casa (dourado) | Faça a mesma receita 3 vezes |

**Salvei a fornada (Fichas de Socorro):** Massa que não cresce, Recheio que escorre, Panetone que afundou, Cobertura que rachou, Miolo seco.

**Extras liberados por progresso** (nunca por gastar PF; nada do que foi comprado fica trancado):

- Ficha extra: Recheio que escorre ou fica mole (libera em Fornada)
- Mini-guia: Ponto da massa em 5 sinais (libera em Confeiteira)
- Mini-guia: Separe tudo antes: o passo a passo (libera em Confeiteira)
- Guia final: Checklist da fornada de encomenda (libera em Mestra do Panetone)

**30 frases de incentivo (cada uma só aparece com um fato real do uso da cliente):**

- Você fez 3 receitas esta semana. Isso é constância.
- Três ou mais fornadas na semana. Sua cozinha está em ritmo.
- Hoje você já cozinhou. Pode descansar com a consciência tranquila.
- A primeira fornada anotada. Todo caderno começa na primeira página.
- 10 fornadas anotadas no seu livro. Dá para ver a sua evolução.
- Dez fornadas ou mais. A mão já conhece a massa.
- 3 dias seguidos na cozinha. Dia de descanso também vale.
- Uma semana inteira de cozinha. Que ritmo bonito.
- Você registrou 2 fotos. Olhar para trás ajuda a acertar na frente.
- Anotar o que mudou é o que faz a receita ficar sua.
- 2 anotações no livro. Você presta atenção no que faz.
- Você já tem 5 selos. Cada um é uma coisa que você fez.
- Fornada salva! Saber recuperar uma massa também é técnica.
- 2 encomendas registradas no seu caderno. Organização é cuidado.
- 2 encomendas entregues. Cada entrega conta.
- Você subiu de nível fazendo, não esperando. Parabéns.
- Já provou 0 tipos de receita. Que variedade.
- 0 receitas favoritas. Você sabe do que gosta.
- 0 desafios feitos esta semana. Pequenos passos somam.
- Uma receita de casa: você já a faz sem olhar tanto a ficha.
- Fornada de presente. Que gesto bonito.
- 0 receitas neste mês. Seu ritmo é só seu.
- Sua última fornada está no livro. Quando quiser voltar, ela te espera.
- Refazer a mesma receita é como se treina a mão.
- Três fotos ou mais: dá para comparar as fornadas lado a lado.
- Três entregas ou mais. Você cumpre o que combina.
- Oito selos ou mais. A sua estante de conquistas está crescendo.
- Confeiteira de verdade: o que você fez para chegar aqui é seu.
- Você marcou o que fez, e só o que fez. Esse é o jeito honesto de acompanhar.
- Você abriu o app hoje. Escolha um passo pequeno, sem pressa.

