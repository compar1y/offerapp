# Fábrica de Panetones Caseiros: área da cliente

Web app (PWA) onde a cliente entra com e-mail e código, vê o que comprou, abre os PDFs no celular e baixa os arquivos. Vite + React 19 + TypeScript. O servidor são funções da Vercel em `api/` (modo stub, sem conta nenhuma criada).

Branch de trabalho: `app-v2` (a partir de `app-v1-demo`). Nada foi publicado e nenhum deploy foi feito.

## Rodar

```bash
npm install
npm run dev            # prévia com demonstração (sem servidor): para olhar o layout
npm run build          # build de PRODUÇÃO (modo servidor, sem nada de demo) + verificação automática
npm run build:preview  # build da PRÉVIA/demonstração (para apresentar o layout)
npm run preview        # serve o que estiver em dist/, abra com largura de 390px
npm run check          # lint + tipos do servidor + teste do servidor + build de produção + verificação + build da prévia
```

### Dois builds: produção e prévia

| | `npm run build` (padrão, produção) | `npm run build:preview` (prévia) |
|---|---|---|
| Modo | servidor (`/api/*`), login real por e-mail e código | demonstração, tudo no navegador |
| Barra "opções de teste", "Sem Fichas", "Ligar ofertas", "Já comprei" | não existe (o código é eliminado do build) | existe |
| Código de acesso `123456` e avisos "modo demonstração" | não existem | existem |
| PDF de exemplo (`public/demo/`) | removido de `dist/` | incluído |
| Catálogo (`/catalogo`, `/caminho`, bolinha vermelha) | desligado até `VITE_CATALOG_ENABLED=true` | ligado |

A diferença vem da constante de build `__PREVIEW__` (`vite.config.ts`). `scripts/verify-prod-bundle.mjs` roda no fim de `npm run build` e FALHA se o `dist/` tiver qualquer resto de demo (`123456`, "Sem Fichas", "Ligar ofertas", "modo demonstração", pasta `demo/`) ou se faltar `checkouts.json`.

**Vercel:** o projeto de produção usa o comando padrão (`npm run build`). Uma prévia de demonstração na Vercel precisa do Build Command `npm run build:preview` (sem isso ela sai como produção e pede servidor).

### Prévia/demonstração (build `--mode preview`)

- Qualquer e-mail entra com o código `123456`.
- Quem entra sempre tem o kit completo. A barra de teste tem "Sem Fichas / Com Fichas", "Ligar ofertas / Ofertas ligadas" e "Já comprei: N" (0, 1 ou 3 itens do catálogo, para ver a Biblioteca completa em destaque e os contextos de trilha).
- Os botões "Abrir PDF" e "Baixar" abrem só `public/demo/amostra-modo-demonstracao.pdf`. Nenhum PDF pago está em `public/` nem no git.
- O formulário "qual sua maior dificuldade agora?" grava no próprio navegador.
- Para ver os botões "Quero isso" no detalhe (e "Desbloquear tudo", da Biblioteca completa) na prévia sem Wiapy: copie `checkouts.example.json` (links fictícios `pay.exemplo.test`) por cima de `public/checkouts.json` só na sua máquina, e não commite. `npm run checkouts:gen` recria os dois arquivos a partir do catálogo.

### Modo servidor (produção e desenvolvimento local)

```bash
cp .env.example .env.local      # preencha os segredos (openssl rand -hex 32)
npm run dev:api                 # roda as funções de api/ em http://localhost:8787
npm run dev:server              # outro terminal: Vite em modo servidor, encaminha /api para a porta 8787
```

Para desenvolvimento local sem conta nenhuma: `DATA_FILE=.data/db.json` (padrão), `FILES_DIR=../pdfs-app` e `DEV_LOG_CODES=1` (imprime o código de login no terminal em vez de mandar e-mail).

## Estrutura

```
shared/catalog.ts      catálogo, PLANS (só o kit completo), ENTITLEMENTS, bump, lista OFFERS de ofertas adicionais (fonte única, usada por src/ e api/)
src/data/config.ts     marca, WhatsApp de suporte, modo demo/servidor
src/data/images.ts     imagens reais usadas (id, arquivo, proporção, texto alternativo)
src/lib/access.ts      AccessProvider (interface) + demoProvider + serverProvider
src/lib/store.ts       estado da tela; só fala com o AccessProvider
src/pages, components  Home, Item (produto), Catálogo, Caminho, Conta, Login/Código, pop-up de boas-vindas, formulário
src/lib/system.ts      trilhas, próximo passo, "Biblioteca completa" (regras do sistema)
shared/game.ts         regras da gamificação (PF, teto, níveis, sequência, desafios, selos, extras): funções puras com teste
src/lib/game.ts        estado local do jogo (localStorage por e-mail) e ações; src/lib/photos.ts = fotos só em IndexedDB
src/lib/theme.ts       tema por oferta e carregamento da fonte do título
server/                lógica do servidor (parser Wiapy, compras, KV, arquivos, assinatura HMAC, e-mail)
api/                   funções da Vercel (finas): auth, me, feedback, file, dl, webhook/wiapy, admin/*
scripts/               dev-api (servidor local), upload-blob, check-files
supabase/schema.sql    SÓ referência opcional; o app não usa Supabase
public/sw.js           service worker só do "casco" do app
```

## Catálogo e ticket único

Fonte: `shared/catalog.ts` (editável).

- **Produto principal**: Fábrica de Panetones Caseiros (100 receitas, PDF).
- **Bônus 01 a 07**: Guia de Embalagem, 20 Ideias de Kits de Natal, Cardápio e Fotos, Mensagens de Natal, Planejador de Produção, Plano B Trufado Rápido, Tabela de Custo e Preço de Venda.
- **Bônus 08 EXTRA**: 50 Receitas do Cardápio de Natal. Atenção: nas pastas do disco os nomes de 07 e 08 estão trocados; no app e nos arquivos `pdfs-app/` o 07 é a Tabela de Custo e o 08 são as 50 Receitas.
- **Order bump** (R$ 7,90): +20 Fichas de Socorro do Panetone (25 páginas).

### Ticket único (decisão do Levi em 26/10/2026)

Existe UM ticket só: **kit completo, R$ 37,90**, checkout `https://pay.wiapy.com/r2PHgYwK6CVi`. Libera produto principal + bônus 01 a 07 + bônus 08 EXTRA. Não existem mais os planos de R$ 10, R$ 17,90 e R$ 22,90 (nem estado "básico", card travado de upgrade ou checkout de R$ 10).

| Item | Libera |
|---|---|
| Kit completo R$ 37,90 | produto principal + bônus 01 a 08 |
| Bump R$ 7,90 | as Fichas de Socorro (compra separada; é o único material do catálogo que aparece travado, com botão de compra e mockup) |
| Ofertas adicionais (OFFERS, 3 slots desligados) | o produto da oferta, quando ela for ligada e comprada |

Quem comprou nunca vê bônus travado. Se alguém sem o kit liberado abrir um material do kit por link direto, o app mostra a mensagem "ainda não está liberado no seu acesso" (com aviso de pagamento aguardando, se houver PIX pendente) e um botão para o suporte no WhatsApp, sem botão de compra.

Para mudar o que o kit libera, edite só `ENTITLEMENTS` em `shared/catalog.ts`. Para preencher os campos que faltam, edite `PLANS.completo` e `BUMP` (`wiapyProductId` e o `checkoutUrl` do bump estão vazios). Botão de compra sem `checkoutUrl` abre o WhatsApp de suporte (só o do kit/bump antigo; as ofertas do catálogo usam `checkouts.json`).

**Quais checkouts liberam o kit (variável `FULL_KIT_CHECKOUT_IDS`):** lista separada por vírgula, comparada com `checkout.id` do webhook. Padrão (se a variável estiver vazia): `r2PHgYwK6CVi` (código público) e `6accaf7eb11ba1ecaf89b37e` (id interno do mesmo checkout), porque a doc da Wiapy não diz qual dos dois vem em `checkout.id`. Qualquer outro checkout é IGNORADO: nada é liberado e fica o evento `purchase.ignored_checkout` (com o motivo) em `/api/admin/events`. Checagem extra opcional: `FULL_KIT_REQUIRE_AMOUNT=1` só libera se o valor do checkout for exatamente 3790 centavos.

| Produto | Código público | `checkout.id` / id (interno) |
|---|---|---|
| Kit completo R$ 37,90 | r2PHgYwK6CVi | 6accaf7eb11ba1ecaf89b37e |
| Bump R$ 7,90 (produto) | | 6ad318de6ebcdbf668bb03c1 |

O bump é detectado por id, título ("fichas de socorro") ou valor (790) dentro do checkout do kit, ou como compra avulsa se o checkout for o próprio produto do bump. Confirmar no primeiro pedido de teste qual id vem em `checkout.id`. Use `WEBHOOK_LOG_RAW=1` para guardar o corpo sem dados pessoais e conferir.

### Ofertas adicionais antigas (3 slots, todos desligados)

São as três ofertas da primeira versão (`kit-lucrativo`, `kit-embalagem-etiqueta`, `fornada-pascoa`). O catálogo novo (próxima seção) vem na frente delas; estas continuam desligadas.

`OFFERS` em `shared/catalog.ts` (reexportada por `src/data/config.ts`). Cada oferta tem: `id`, `title`, `subtitle`, `description`, `includes`, `priceCents`, `checkoutUrl` (vazio), `wiapyProductId` (vazio), `enabled` (false), `kind` (`upsell`, `downsell`, `seasonal`), `placement`, `requiresDismissed`, `cover` (mockup) e `files`.

| Oferta | Preço | kind | Onde aparece |
|---|---|---|---|
| Kit Panetone Lucrativo | R$ 77 | upsell | banner na home; rodapé da página de uma receita/bônus depois de a cliente tocar em "Fiz essa" |
| Kit Embalagem e Etiqueta | R$ 37 | downsell | só depois de a cliente tocar em "Agora não" no Kit Lucrativo (e se não o comprou). Descrito como etiquetas e rótulos imprimíveis, para não repetir o Bônus 01 (Guia de Embalagem) |
| Fornada de Páscoa | R$ 77 | seasonal | card com cadeado e mockup na home. O clique grava o evento `offer.click`; na página, "Tenho interesse" grava `offer.interest` (enquanto não houver checkout) |

Regras:
- **Desligada = invisível.** Com `enabled: false` nada aparece para a cliente (nem a página `/produto/<id>`), o webhook ignora o checkout e o arquivo não é entregue.
- **Quem comprou não vê a oferta.** Ela some do banner, do rodapé e do card; o produto comprado aparece em "Seus extras" na home, com "Acessar".
- Sempre marcada "COMPRA ADICIONAL", com o que é e o preço. (Texto antigo da fase 1, trocado: hoje o convite é "Ver como ajuda" / "Quero isso", verde, distinto do "Acessar". Ver "Comunicação das ofertas" abaixo.)
- Layout: imagem/mockup em cima, informação embaixo. Sem mockup (`cover: null`), só em modo demonstração aparece um placeholder simples "EM BREVE" com fundo transparente; no app real não aparece imagem nenhuma. Os 3 mockups que faltam estão em `IMAGENS-FALTANDO.md`.
- Estado e medição: "Fiz essa", "Agora não" e "Tenho interesse" ficam guardados no aparelho (localStorage) e também viram eventos no servidor via `POST /api/event` (`item.done`, `offer.dismiss`, `offer.click`, `offer.interest`; só esses nomes, sessão obrigatória, ver em `GET /api/admin/events`). Não há tela de relatório: os cliques se leem nos eventos.
- Liberação: webhook com `checkout.id`, `orderbump[].id` ou `products[].id` igual ao `wiapyProductId` (ou título com os `titleHints`) de uma oferta LIGADA libera só aquela oferta. Manual: `POST /api/admin/grant` com `offers: ["kit-lucrativo"]`; CSV: coluna `ofertas` (ids separados por `|`).

Para ligar uma oferta: preencha `checkoutUrl` e `wiapyProductId`, cadastre o arquivo em `files`, suba o arquivo no armazenamento privado (`npm run upload:files`), preencha `cover` com o mockup e troque `enabled` para `true`. Para ver só o visual: no modo demonstração use "Ligar ofertas" da barra de teste.

## Catálogo de ofertas como sistema (`/catalogo`, `/caminho`)

Fonte: `shared/catalog.ts` (OFFERS com `catalog: true`, TRACKS, HOOKS, COMBO, OFFER_VISUAL). Documentos de decisão: `../OFERTAS-30-TIER-S.md` e `../CATALOGO-OFERTAS-APP.md`. Para lançar: `../CHECKLIST-LANCAMENTO.md`.

**Desligado em produção.** O catálogo só existe se `CATALOG_ENABLED` for verdadeiro: sempre na prévia; em produção só com `VITE_CATALOG_ENABLED=true` no build (só quando o Levi mandar). Desligado, nenhuma rota, bolinha, banner ou card do catálogo aparece.

- **17 ofertas ligadas (`enabled`)**: 10 do tier S (Vulcão, Vitrine com Fotos, Caixas de Doces de Natal = Destaque, Segredo dos Recheios, 15 Receitas que VÃO EXPLODIR, 20 Sobremesas com Panetone, Ceia Doce, Mini Panetones, Rabanada de Padaria, Doces para Revender) e 7 de Natal/Ano Novo. Se não há link nem `ready:true` em `checkouts.json`, o card mostra "Disponível em breve" + "Quero ser avisada".
- **Acesso imediato:** pendente não libera; pago libera uma vez; estorno/chargeback revoga; direitos calculados na leitura.
- **Telas (390 px, pouco texto):** `Início` ("Meus produtos" em carrossel, cartão "Minha fornada", Fichas, "Para você"), `Biblioteca` (rota `/catalogo`: UMA lista vertical de todas as ofertas, scroll suave, sem coleções nem carrosséis; primeiro as ofertas de lançamento (tier S) prontas/"Para você", depois as demais; o card "Biblioteca completa" (combo R$ 97, soma riscada calculada) é o ÚLTIMO item) e `Seu caminho` (rota `/caminho`: as 4 trilhas em carrosséis, com anel de progresso por trilha). Bullets, pilha de valor, bônus, garantia e "O que você recebe" ficam SÓ na tela de detalhe `/produto/<id>`.
- **Botão e cadeado (ajuste do Levi):** oferta não adquirida mostra 🔒 no canto da capa (`aria-label="Bloqueado, desbloqueie para acessar"`) e o botão verde "Desbloquear por R$ X" (preço do catálogo, só no botão), que pulsa de leve (`.btn-pulse`; com `prefers-reduced-motion` fica estático). Combo: "Desbloquear tudo por R$ 97". Pronta + link https: abre o checkout direto (nova aba). Não pronta: "Disponível em breve" (sem pulso) + "Quero ser avisada". Oferta adquirida: "Acessar", sem cadeado (nunca cadeado no que a cliente comprou). Sem contagem, "últimas" ou escassez.
- **Botões:** o convite ("Desbloquear por R$ X") é verde vivo (#34B85A, tinta escura #06240F, contraste 6,4:1), em pílula, sem caixa alta. "Acessar" e os botões principais são verde escuro (#17704A, texto branco, contraste 6,1:1). Seguem distintos de propósito (ANEXO item 16). "Quero ser avisada" é contorno verde.
- **Identidade por oferta só na capa** (fundo e destaque do card de imagem). A UI geral tem uma paleta só. Fonte Outfit (a da página de referência) hospedada em `public/fonts/outfit-latin-wght.woff2` (sem Google Fonts, sem requisição a terceiros; licença OFL ao lado; fallback Segoe UI/system-ui). Substituiu a Inter. O service worker só guarda woff2 do próprio domínio.
- **Imagens:** só em cards de acesso, produtos bloqueados/à venda e ícones funcionais. `public/img/catalogo/<id>.webp` (produto, 640x960 transparente; 800x600 em `dia-producao-escala`) e `<id>-bonus.webp` (faixa 900x300 transparente, só no detalhe da oferta, na seção "Bônus que vêm junto"). 27 de 27 arquivos prontos (17 produtos + 10 faixas). `npm run catalogo:imagens` confere e atualiza `src/data/catalog-images.json` (roda antes do build). Ver `../IMAGENS-FALTANDO.md`.
- **Sistema:** 4 trilhas, 12 ganchos, sem coleções (removidas a pedido do Levi). "Biblioteca completa" (antes "Leve tudo") é o último item da lista; fica em destaque (largo) com 3+ itens liberados. Bump (Fichas de Socorro) é por cliente, fora da soma do combo.
- **Webhook:** `detectOffers` libera a oferta por `wiapyProductId`/`titleHints`; `detectBundles` reconhece o combo.
- **Eventos** (`POST /api/event`, só estes nomes): `catalog.view`, `offer.view|click|interest|dismiss`, `item.done|undone`, `combo.view|spin|click|interest`, `journey.view`, `hook.click`.

### `public/checkouts.json`: links de compra e "pronto" de cada oferta

Arquivo ÚNICO que diz o que dá para comprar. Por id: `{ "checkoutUrl": "https://pay.wiapy.com/...", "ready": true, "price": 2790 }` (`price` opcional, em centavos; se existir, vale no lugar do preço do catálogo). Ids aceitos (26): as 24 ofertas de `OFFERS` (inclui `calculadora`, a Conta da Fornada) (17 do catálogo + 6 fora dele), `combo` e `bump`. `npm run checkouts:gen` cria o arquivo padrão (tudo vazio e `ready:false`) e o `checkouts.example.json` com links fictícios.

- **O checkout abre direto pelo botão verde** ("Desbloquear por R$ X", nova aba) no card, no detalhe e na Biblioteca completa. Só quando `ready === true` E há link `https`. Qualquer outra coisa vira "Disponível em breve" + "Quero ser avisada" (visual final, sem cara de beta). Link sem `ready:true` NÃO vende; `ready:true` sem link também não.
- **Colar o link e marcar `ready:true` liga o botão sem rebuild de código.** O app busca `./checkouts.json?t=<agora>` com `cache: 'no-store'` ao abrir e quando volta para a aba; o service worker NUNCA guarda esse arquivo (`sw.js` bloqueia) e a Vercel manda `Cache-Control: no-store` (`vercel.json`). Atenção: na Vercel o arquivo é estático, então editar exige um novo deploy estático (commit do arquivo), mas nenhum build de lógica do app.
- Arquivo ausente, ilegível ou id desconhecido: nada fica pronto (seguro). Só `ready: true` exato vale; `price` precisa ser inteiro positivo.
- **O servidor lê o mesmo arquivo** (`CHECKOUTS_FILE`, padrão `public/checkouts.json`, incluído nas funções pelo `vercel.json`), com cache de `CHECKOUTS_CACHE_MS` (padrão 30000; 0 = sempre relê). É isso que decide, no `/api/me`, quais itens de um combo já estão liberados.
- O `checkoutUrl` do kit completo (R$ 37,90) continua em `PLANS.completo` (não vem do arquivo).

### Preços, gate e direitos do combo

- **Biblioteca completa = R$ 97,00** (`COMBO.comboPriceCents`, 9700). A soma riscada ("valor somado dos itens", só no detalhe) é SEMPRE calculada a partir das ofertas ligadas do catálogo (hoje R$ 557,20 para as 17), nunca digitada. "ou 12x" só aparece se `COMBO.comboInstallments === 12` (padrão `null`; só depois de o Caixa confirmar na Wiapy).
- **Honestidade:** o card mostra "N de M prontos hoje" (pronto = `ready:true` em `checkouts.json`); item ainda não pronto mostra "entra automático quando sair". O preço de demonstração só existe na prévia.
- **Gate do botão de compra:** o combo só mostra o botão de compra com link E itens prontos >= mínimo (`VITE_COMBO_MIN_AVAILABLE`, padrão 10). Senão: "Disponível em breve" + "Quero ser avisada".
- **Direitos:** comprar o combo grava o direito (`bundles: ['combo']`). O `/api/me` resolve os itens na leitura: os que já estão prontos são liberados na hora; os outros são liberados sozinhos quando o `ready` virar `true`. Estorno/chargeback revoga tudo. Coberto por `npm run test:api`.

### Para ligar uma oferta do catálogo
1. Criar o checkout na Wiapy e anotar o `wiapyProductId` em `shared/catalog.ts`. 2. Arquivo em `files` + `npm run upload:files` (PDF pago nunca no git nem em `public/`). 3. Em `public/checkouts.json`: link e `ready: true`. 4. `VITE_CATALOG_ENABLED=true` no build quando o Levi mandar (e `COMBO.enabled` para a Biblioteca completa).

### Variáveis opcionais (webhook e catálogo)
`BUMP_ORDERBUMP_IDS`, `FULL_KIT_AMOUNT_CENTS`, `BUMP_TOTAL_CENTS`, `FULL_KIT_CHECKOUT_IDS`, `FULL_KIT_REQUIRE_AMOUNT`, `CHECKOUTS_FILE`, `CHECKOUTS_CACHE_MS`, `VITE_CATALOG_ENABLED`, `VITE_COMBO_MIN_AVAILABLE`, `CALC_CHECKOUT_IDS`, `CALC_AMOUNT_CENTS`, `VITE_CALC_ENABLED`.

## Conta da Fornada (calculadora de custo e preço, R$ 19,90)

Plano e decisões: `../CALCULADORA-PLANO.md`. Rota `/conta-da-fornada/*` (`src/calc/`), regras puras em `shared/calc.ts` (tudo em centavos inteiros) e `shared/calc-sync.ts` (documento de sincronização).

- **Venda:** pagamento único de R$ 19,90, FORA do combo "Biblioteca completa" (`catalog:false`, `tool:true`): o combo não a inclui, a soma riscada não a conta e o gate de itens prontos (>= 10) não a conta. É a primeira oferta da lista e pode ser a única `ready:true` (id `calculadora` em `public/checkouts.json`, `ready:false` até o Caixa criar o checkout). As outras 17 seguem "Em breve".
- **Liberação:** webhook da Wiapy com item `calculadora`. Detecção por `checkout.id` (público ou interno) vindo de `wiapyProductId`, do link em `checkouts.json` e de `CALC_CHECKOUT_IDS`. Idempotente por `payment.id`. Estorno e chargeback revogam SÓ a ferramenta; as contas da cliente ficam (no aparelho e no servidor) e ela continua podendo exportar e apagar. `CALC_AMOUNT_CENTS` (padrão 1990): valor diferente só registra `purchase.amount_mismatch`. O direito aparece em `GET /api/me` (`tools.calculadora = { owned, roundUsed, roundRecipe }`).
- **Rodada grátis:** 1 conta completa por e-mail, contada no servidor (`POST /api/calc/round`, contador com incr). Quem paga depois não perde a conta grátis. Sem conta paga: só 1 receita, sem Preço, Mês, Hora, Ferramentas nem sincronização.
- **Dados e sincronização (V1):** no aparelho ficam em IndexedDB/localStorage; para quem tem a ferramenta E sessão, o estado é sincronizado com a conta: `GET /api/calc/sync` e `PUT /api/calc/sync` (versão + `updatedAt`; conflito resolvido por item mais recente, com merge simples; itens apagados viram marca por 90 dias; limite de 256 KB por bloco e 768 KB no total; 60 gravações por hora, senão 429/413; sem direito 403). Também `GET /api/calc/export` (só sessão, vale após estorno) e `POST /api/calc/delete` (só sessão, apaga do servidor). Na tela Dados: sincronizar agora, exportar/importar arquivo (aparelho ou conta), apagar do aparelho, da conta ou tudo, com confirmação.
- **Chaves no KV:** `calc:<email>:core|contas|extra`, `calc:round:<email>`, `calc:roundinfo:<email>`.
- **Pré-preenchimento:** os custos vêm das 100 receitas do Bônus 07 (`shared/receitas-custo.ts`, gerado por `npm run calc:gen` a partir de `receitas-100.json`). Os preços são EXEMPLOS (botão "Usar preços de exemplo do Bônus 07", sempre rotulado "exemplo"); a cliente troca pelos dela. Teste de diferença zero em centavos contra `calc.py`/`calculos-conferidos` (`npm run test:calc`, 1866 conferências).
- **Gamificação:** selo "Fiz minha conta" (+15 PF, uma vez), +5 PF por receita nova (máx. 2 por dia), selo "Conta de 5 receitas" (+10 PF). Abrir a ferramenta não dá ponto.
- **Entradas:** card com 🔒 e botão pulsante "Desbloquear por R$ 19,90" + link "Fazer 1 conta grátis" (Início, Biblioteca, Para você), cartão "Quanto custou essa fornada?" depois de "Fiz essa" e no Bônus 07, link nos selos que faltam em Fornada. Com a ferramenta, ela vira peça de "Meus produtos".
- **Variáveis:** `CALC_CHECKOUT_IDS`, `CALC_AMOUNT_CENTS` (servidor) e `VITE_CALC_ENABLED` (build; padrão LIGADO, `false` esconde a ferramenta).
- **Funções da Vercel:** o limite do plano Hobby é 12. As 4 rotas `admin/*` foram juntas em `api/admin/[action].ts` (mesmas URLs: `/api/admin/events|grant|import-csv|revoke`) e entrou `api/calc/[action].ts`: são 10 funções.
- **Privacidade:** as contas são da cliente; o servidor só guarda cópia de quem tem a ferramenta e está logada, sem preço de venda de terceiros, sem cruzar com outros dados, apagável a qualquer hora.
- **Textos:** as strings da ferramenta (`src/calc/strings.ts`) ficam fora do teste de comunicação das ofertas, como no plano; a regra de honestidade (sem renda inventada, exemplo rotulado) vale igual.

## Minha fornada (gamificação local)

Detalhes e textos: `../GAMIFICACAO-APP.md`. Regras puras em `shared/game.ts` (testadas em `server/test/smoke.ts`, grupo 27); estado em `src/lib/game.ts`.

- **Onde mora:** rota `/fornada` (cartão na Início; aba "Fornada" na barra quando o catálogo está ligado) e as telas `/fornada/pontos|selos|livro|encomendas|mes|extras`.
- **Pontos de Fornada (PF):** só por ação que a cliente marca. Teto de 60 PF por dia (vale para tudo). Níveis Aprendiz/Fornada/Confeiteira/Mestra do Panetone em 0/100/300/700 PF; o nível nunca desce. Sem valor em dinheiro, sem sorteio, sem prêmio simulado, sem punição, sem escassez.
- **Dados:** localStorage `panetone-game:v1:<e-mail>` e fotos SÓ em IndexedDB (`panetone-fotos`) no aparelho. Nada vai ao servidor. "Apagar meus dados de jogo" (Minha conta) zera tudo, inclusive as fotos. "Modo sem pressão" esconde pontos, nível e sequência.
- **Selos:** os 12 selos do GPT (s11 "Conta de 5 receitas" e s12 "Primeira venda anotada" entregues em 27/10/2026; o s12 ainda não tem conquista ligada) (WebP com transparência, 256x256, de `imagens-catalogo/selos/*.png`) estão em `public/selos/` e ligados em `src/data/selos.ts` (`SEAL_IMAGES_READY`); nomes em `SEAL_FILES` (`shared/game.ts`). O SVG funcional (`src/components/Seal.tsx`) segue como fallback: para a "Receita de casa" dourada (sem arquivo) e se uma imagem falhar ao carregar.
- **Decisão (Levi): a gamificação fica LIGADA em produção**, independente de `VITE_CATALOG_ENABLED`. "Minha fornada" aparece na Início só para quem já tem o kit principal; as rotas `/fornada/*` sem o kit voltam para a Início. A barra inferior (aba Fornada) continua dependendo da flag do catálogo.
- **Ideias futuras (não implementadas):** 14, 16, 18, 19 e 26 de `../GAMIFICACAO-GPT.md`.

### Gamificação v3 (barra fixa, missões, extras por progresso, comemoração, ranking anônimo, diário)

Textos completos em `COMUNICACAO-OFERTAS.md` (seção "Gamificação v3") e regras em `../GAMIFICACAO-APP.md`.

- **Barra fixa** (`GameBar`, sticky no topo de todas as telas do app): selo do nível, nome, PF e barra até o próximo nível ("faltam N PF para X"). Só para quem tem o kit; some no modo sem pressão ou com o jogo desligado. Toque abre `/fornada`. O `body` usa `overflow-x: clip` (com `hidden` o `position: sticky` não cola).
- **Missões do dia:** 3 por dia, sorteadas de uma lista fixa de 8 (`MISSIONS`), cada uma marcada só pela ação real (+4 PF; as 3 juntas +6; sempre dentro do teto de 60 PF por dia). O que não deu hoje não vira dívida: no dia seguinte as missões trocam, sem punição.
- **Extras por progresso:** 12 extras de texto real (`EXTRAS` em `shared/game.ts`), com a regra de abertura (nível, fornadas, dias, selos ou contas). Etiqueta fixa "Extra do app, liberado por progresso". Nunca trancam o que a cliente comprou e, uma vez abertos, nunca fecham de novo. A tela mostra o próximo extra e o que falta.
- **Comemoração:** cartão no topo (selo, nível, extra, missões feitas ou receita) com confete só de CSS (28 peças, sem canvas, sem som). Com `prefers-reduced-motion` aparece só o cartão. Liga/desliga em Minha conta, "Comemorações".
- **Selos surpresa:** 10 selos escondidos (`HIDDEN_SEALS`), mostrados só depois de conquistados, sem dica prévia. SVG funcional em `Seal.tsx`; a arte do GPT está pedida em `../IMAGENS-FALTANDO.md`.
- **Metas da Conta da Fornada:** primeira conta, 5 contas (selo s11) e primeira venda anotada (selo s12), no hub `/fornada`.
- **Diário de vendas** (`/fornada/vendas`): produto, quantidade, valor e data que a cliente digita; só soma o que foi digitado, nada estimado. Mora no mesmo documento da Conta da Fornada (IndexedDB; sincroniza com a conta SÓ com o direito `calculadora`, senão fica no aparelho). Apagar uma venda deixa uma marca (`apagadas`) para não voltar na sincronização. "Apagar meus dados da calculadora" apaga o diário junto.
- **Ranking semanal anônimo** (`/fornada/ranking`, opcional): a cliente escolhe entrar, recebe um apelido gerado ("Fornada 4F2") e o servidor guarda SÓ o apelido e os PF da semana (semana de segunda a domingo, horário de Brasília). Sem nome, e-mail ou foto. Top 10 mais a posição da própria cliente; empate divide a posição. A lista só aparece quando houver participantes reais suficientes (`RANK_MIN_PARTICIPANTS`, padrão 10, aceita 2 a 1000); antes disso a tela diz quantos faltam e nunca há perfil falso. Botão "Sair e apagar meus dados do ranking" apaga o apelido e os PF. Fica escondido no modo sem pressão e com o jogo desligado. Código em `shared/rank.ts` (regras puras), `server/rank.ts` (KV: `rank:me:<hmac>`, `rank:names`, `rank:wk:<semana>`, `rank:rl:<id>`) e `src/lib/rank.ts`. As rotas (`/api/event?r=board|join|score|leave`) ficam dentro de `api/event.ts`: **continuam 10 funções** (limite de 12 do plano Hobby da Vercel). Na prévia o ranking é simulado no navegador com UM participante (você), e por isso nunca mostra lista.
- **Flags:** `VITE_RANK_ENABLED=false` esconde o ranking (padrão ligado); `VITE_CATALOG_ENABLED` e `VITE_CALC_ENABLED` seguem como antes (a barra e as missões NÃO dependem do catálogo). Variável de servidor: `RANK_MIN_PARTICIPANTS`.
- **Decisão sobre "ranking e diário fora do modo sem pressão":** no modo sem pressão (e com o jogo desligado) o ranking e o diário somem das telas e as rotas voltam para `/fornada`; os dados ficam guardados e voltam quando a cliente sair do modo. Sair do ranking é outro botão.

## Estados de compra e liberação

| `payment.status` (Wiapy) | Estado no app | Efeito |
|---|---|---|
| `unpaid` (PIX gerado) | pending | NÃO libera |
| `paid` | paid | libera, uma única vez (idempotente por `payment.id`) |
| `credit_card_declined` | declined | não libera |
| `refunded` | refunded | revoga |
| `chargedback` | chargeback | revoga |
| `payment: null` (carrinho abandonado) | só evento | nenhuma compra criada |

Um `paid` que chega depois de estorno/chargeback é ignorado (não libera de novo). Um checkout fora de `FULL_KIT_CHECKOUT_IDS` (e que não seja o produto avulso do bump ou de uma oferta ligada) é ignorado e vira o evento `purchase.ignored_checkout`. Os direitos são calculados na leitura, somando as compras pagas (webhook, manual e CSV). Cada evento guarda origem (`wiapy:checkout:<id>`, `manual`, `csv`, `app`) e pedido.

## Webhook da Wiapy

URL a cadastrar: `https://<seu-dominio>/api/webhook/wiapy`. Token: o mesmo valor de `WIAPY_WEBHOOK_TOKEN`, que a Wiapy manda no header `Authorization` (sem HMAC; a doc não descreve assinatura). Eventos do painel: pagamento aprovado, PIX gerado (se existir), estornado e chargeback.

O parser segue a doc pública (help.wiapy.com, atualizada em 06/07/2026): JSON, `payment.id`, `payment.status`, `payment.amount` e `checkout.amount` em centavos, `checkout.orderbump[]`, `products[]` com `itens`, `customer.email`. Ignora campos extras e aceita o JSON com vírgulas faltando ou sobrando (os exemplos da doc têm esse erro). Respostas: 200 processado (inclusive duplicado), 401 token errado, 400 corpo ilegível, 422 sem `payment.id` ou e-mail, 503 sem configuração. A doc não diz o que a Wiapy espera como resposta nem se reenvia; o desenho é seguro para reenvio.

Não documentado pela Wiapy (conferir na primeira venda de teste): exemplos de `unpaid`, `refunded` e `chargedback`; prefixo do token; política de retry; id de pedido diferente de `payment.id`.

## Arquivos pagos

Os PDFs ficam em armazenamento PRIVADO e nunca em `public/` nem no git (`.gitignore` bloqueia `*.pdf`, `pdfs-app/` e `private-files/`).

Fluxo: o app chama `GET /api/file/<arquivo>` com a sessão; o servidor confere se a compra paga libera o item e devolve uma URL temporária assinada (HMAC com `FILE_SIGNING_SECRET`, vale `FILE_URL_TTL_SEC`, padrão 5 minutos); `GET /api/dl/<arquivo>?...` confere a assinatura e entrega o arquivo com `Cache-Control: private, no-store`.

- Desenvolvimento: `FILES_DIR=../pdfs-app`.
- Produção: Vercel Blob privado. Crie um store privado, defina `BLOB_READ_WRITE_TOKEN` e rode `BLOB_READ_WRITE_TOKEN=... npm run upload:files -- ../pdfs-app`. Os nomes são os `storageKey` do catálogo. `npm run check:files -- ../pdfs-app` confere se não falta nenhum.

## Passo a passo para ligar de verdade

1. Repositório GitHub e projeto na Vercel (conta do Levi). Comando de build padrão (`npm run build`): já sai em modo servidor, sem demo.
2. Armazenamento de dados: criar um Redis (Upstash, direto ou pelo Marketplace da Vercel) e copiar `KV_REST_API_URL` e `KV_REST_API_TOKEN`. A Vercel não tem disco gravável: sem esses dois, o servidor responde 503.
3. Arquivos: criar o Blob privado e subir os PDFs (seção acima).
4. E-mail do código: conta no Resend, domínio verificado, `RESEND_API_KEY` e `MAIL_FROM`.
5. Variáveis: `FULL_KIT_CHECKOUT_IDS` (opcional, padrão `r2PHgYwK6CVi`); segredos: `SESSION_SECRET`, `FILE_SIGNING_SECRET`, `WIAPY_WEBHOOK_TOKEN`, `ADMIN_TOKEN` (gerar com `openssl rand -hex 32`, só nas variáveis da Vercel).
6. Wiapy: cadastrar a URL do webhook e o token; marcar os eventos; fazer um pedido de teste (PIX gerado e pago) com `WEBHOOK_LOG_RAW=1` e conferir o corpo em `GET /api/admin/events`.
7. Preencher o número real do WhatsApp em `src/data/config.ts` (hoje `5500000000000`, marcado TODO).
8. Importar os clientes antigos: `POST /api/admin/import-csv` (colunas `email,plano,bump,ofertas`; `plano` = `completo`, `sim` ou `37,90`; `ofertas` = ids separados por `|`). Liberação avulsa: `POST /api/admin/grant`. Encerrar acesso: `POST /api/admin/revoke`. Todos com `Authorization: Bearer <ADMIN_TOKEN>`.
9. Validar o primeiro deploy: as funções usam imports com extensão `.js` e handlers no formato Web (`export async function POST(request: Request)`). Foram testadas localmente (`npm run test:api`, `npm run dev:api`), mas ainda NÃO em uma conta Vercel.

## Segurança e regras do produto

- Sem segredos no código: tudo por variável de ambiente (`.env.example` só lista os nomes).
- Login por código de 6 números (vale 10 minutos, 5 tentativas, 5 pedidos por hora por e-mail, 30 por IP). O código só é enviado para e-mail que tenha compra registrada, mas a resposta é sempre a mesma. "Reenviar código" na tela do código (espera de 30 segundos).
- PWA: `manifest.webmanifest`, ícones e `sw.js` só com o "casco" do app. O service worker nunca guarda `/api/*`, PDFs, planilhas, textos ou respostas `no-store`. `vercel.json` manda `sw.js` sem cache.
- Pop-up de instalação no primeiro acesso, sem obrigar a instalar.
- Gamificação só com ações marcadas pela cliente (PF com teto diário, sem valor em dinheiro). O ranking é opcional, anônimo e fica atrás da flag `VITE_RANK_ENABLED`. Sem contador falso, sem escassez falsa, sem promessa de renda em número, sem depoimentos.
- Se o servidor não está configurado em produção, a tela mostra erro claro e nada é liberado.

## Pendências que dependem de contas

Veja `RELATORIO-FASE1.md` (fora desta pasta).

## Comunicação das ofertas e estilo de referência (v4)

- **Tom:** necessidade primeiro (situação real da cozinha, "Para quando a massa não crescer", "Seu próximo passo"), depois como ajuda, e só no fim o preço (discreto na lista, claro no detalhe e no checkout). Nada de "compre", "oferta" ou "desconto" em destaque. Sem depoimento inventado, estatística, escassez ou promessa de renda.
- **Áreas:** navegação Início | Biblioteca | Seu caminho | Conta. Seções "Para você", "Para o seu caminho", "Biblioteca completa", "Todos os materiais", "Para quando a massa não crescer" (Fichas de Socorro).
- **Contexto do card:** `src/lib/context.ts` junta o estado real (`done` = "Fiz essa", `seen` = "Marcar como visto", itens que a pessoa tem) com `offerContextFor` do catálogo. Prioridade: fez algo relacionado, trilha em andamento ("Sua trilha “X”: n de m"), marcou como visto, e sem contexto a frase de necessidade.
- **Onde ficam os textos:** só em `shared/catalog.ts` (`COPY`, `OFFER_COPY`, `COLLECTION_COPY`, `HOOKS`). `npm run comunicacao:gen` gera `COMUNICACAO-OFERTAS.md` com todos eles (por oferta: necessidade, como ajuda, pergunta, contexto por situação, convite). O teste de fumaça (grupo "COMUNICAÇÃO DAS OFERTAS") falha se aparecer "compre", "oferta", "desconto", porcentagem inventada, escassez ou travessão nos textos.
- **Estilo de referência** (https://fabricadepanetones.vercel.app/, só estilo, sem copiar texto nem imagem): fundo #FFFBF8, faixas #FDF1EE, texto #24170F, apoio #6E625B, linha #EADFDA, vermelho #C1121F, verde #1E9E5A, dourado #C9A04F, vinho #2A1212; Outfit (pesos 800 nos títulos e botões); cards com raio 22px, borda 1px e sombra mínima; botões em pílula com sombra verde suave. Tokens no bloco "VISUAL v4" de `src/index.css`. Ajuste de acessibilidade: o verde da referência com texto branco dá 3,4:1, então "Acessar" usa #17704A e o convite usa #34B85A com tinta escura. Paleta completa e medidas em `COMUNICACAO-OFERTAS.md` (seção "Estilo de referência").
- Os relatórios antigos (`RELATORIO-FASE1.md`, `OFERTAS-*.md`) ainda citam "Leve tudo" e "Comprar": são históricos. O nome atual é "Biblioteca completa" e o convite é "Ver como ajuda" / "Quero isso".
