# Fábrica de Panetones Caseiros: área da cliente

Web app (PWA) onde a cliente entra com e-mail e código, vê o que comprou, abre os PDFs no celular e baixa os arquivos. Vite + React 19 + TypeScript. O servidor são funções da Vercel em `api/` (modo stub, sem conta nenhuma criada).

Branch de trabalho: `app-v2` (a partir de `app-v1-demo`). Nada foi publicado e nenhum deploy foi feito.

## Rodar

```bash
npm install
npm run dev          # modo demonstração (padrão): tudo no navegador, sem servidor
npm run build && npm run preview   # prévia de produção, abra com largura de 390px
npm run check        # lint + tipos do servidor + teste do servidor + build
```

### Modo demonstração (padrão)

- Qualquer e-mail entra com o código `123456`.
- Quem entra sempre tem o kit completo. Aparece uma barra de teste com dois botões: "Sem Fichas / Com Fichas" e "Ligar ofertas / Ofertas ligadas" (o das ofertas recarrega a página). Só existe nesse modo.
- Os botões "Abrir PDF" e "Baixar" abrem só `public/demo/amostra-modo-demonstracao.pdf` (um PDF pequeno de exemplo). Nenhum PDF pago está na pasta `public/` nem no git.
- O formulário "qual sua maior dificuldade agora?" grava no próprio navegador.

### Modo servidor

```bash
cp .env.example .env.local      # preencha os segredos (openssl rand -hex 32)
npm run dev:api                 # roda as funções de api/ em http://localhost:8787
VITE_ACCESS_MODE=server npm run dev   # outro terminal: o Vite encaminha /api para a porta 8787
```

Para desenvolvimento local sem conta nenhuma: `DATA_FILE=.data/db.json` (padrão), `FILES_DIR=../pdfs-app` e `DEV_LOG_CODES=1` (imprime o código de login no terminal em vez de mandar e-mail).

## Estrutura

```
shared/catalog.ts      catálogo, PLANS (só o kit completo), ENTITLEMENTS, bump, lista OFFERS de ofertas adicionais (fonte única, usada por src/ e api/)
src/data/config.ts     marca, WhatsApp de suporte, modo demo/servidor
src/data/images.ts     imagens reais usadas (id, arquivo, proporção, texto alternativo)
src/lib/access.ts      AccessProvider (interface) + demoProvider + serverProvider
src/lib/store.ts       estado da tela; só fala com o AccessProvider
src/pages, components  Home, Item (produto), Conta, Login/Código, pop-up de boas-vindas, formulário
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

Para mudar o que o kit libera, edite só `ENTITLEMENTS` em `shared/catalog.ts`. Para preencher os campos que faltam, edite `PLANS.completo` e `BUMP` (`wiapyProductId` e o `checkoutUrl` do bump estão vazios). Botão de compra sem `checkoutUrl` abre o WhatsApp de suporte.

**Quais checkouts liberam o kit (variável `FULL_KIT_CHECKOUT_IDS`):** lista separada por vírgula, comparada com `checkout.id` do webhook. Padrão (se a variável estiver vazia): `r2PHgYwK6CVi` (código público) e `6accaf7eb11ba1ecaf89b37e` (id interno do mesmo checkout), porque a doc da Wiapy não diz qual dos dois vem em `checkout.id`. Qualquer outro checkout é IGNORADO: nada é liberado e fica o evento `purchase.ignored_checkout` (com o motivo) em `/api/admin/events`. Checagem extra opcional: `FULL_KIT_REQUIRE_AMOUNT=1` só libera se o valor do checkout for exatamente 3790 centavos.

| Produto | Código público | `checkout.id` / id (interno) |
|---|---|---|
| Kit completo R$ 37,90 | r2PHgYwK6CVi | 6accaf7eb11ba1ecaf89b37e |
| Bump R$ 7,90 (produto) | | 6ad318de6ebcdbf668bb03c1 |

O bump é detectado por id, título ("fichas de socorro") ou valor (790) dentro do checkout do kit, ou como compra avulsa se o checkout for o próprio produto do bump. Confirmar no primeiro pedido de teste qual id vem em `checkout.id`. Use `WEBHOOK_LOG_RAW=1` para guardar o corpo sem dados pessoais e conferir.

### Ofertas adicionais (OFFERS): 3 slots, todos desligados

`OFFERS` em `shared/catalog.ts` (reexportada por `src/data/config.ts`). Cada oferta tem: `id`, `title`, `subtitle`, `description`, `includes`, `priceCents`, `checkoutUrl` (vazio), `wiapyProductId` (vazio), `enabled` (false), `kind` (`upsell`, `downsell`, `seasonal`), `placement`, `requiresDismissed`, `cover` (mockup) e `files`.

| Oferta | Preço | kind | Onde aparece |
|---|---|---|---|
| Kit Panetone Lucrativo | R$ 77 | upsell | banner na home; rodapé da página de uma receita/bônus depois de a cliente tocar em "Fiz essa" |
| Kit Embalagem e Etiqueta | R$ 37 | downsell | só depois de a cliente tocar em "Agora não" no Kit Lucrativo (e se não o comprou). Descrito como etiquetas e rótulos imprimíveis, para não repetir o Bônus 01 (Guia de Embalagem) |
| Fornada de Páscoa | R$ 77 | seasonal | card com cadeado e mockup na home. O clique grava o evento `offer.click`; na página, "Tenho interesse" grava `offer.interest` (enquanto não houver checkout) |

Regras:
- **Desligada = invisível.** Com `enabled: false` nada aparece para a cliente (nem a página `/produto/<id>`), o webhook ignora o checkout e o arquivo não é entregue.
- **Quem comprou não vê a oferta.** Ela some do banner, do rodapé e do card; o produto comprado aparece em "Seus extras" na home, com "Acessar".
- Sempre marcada "COMPRA ADICIONAL", com o que é e o preço. Botão de comprar (borda dourada, carrinho) distinto do de acessar (sólido). Sem checkout, "Comprar" abre o WhatsApp de suporte.
- Layout: imagem/mockup em cima, informação embaixo. Sem mockup (`cover: null`), só em modo demonstração aparece um placeholder simples "EM BREVE" com fundo transparente; no app real não aparece imagem nenhuma. Os 3 mockups que faltam estão em `IMAGENS-FALTANDO.md`.
- Estado e medição: "Fiz essa", "Agora não" e "Tenho interesse" ficam guardados no aparelho (localStorage) e também viram eventos no servidor via `POST /api/event` (`item.done`, `offer.dismiss`, `offer.click`, `offer.interest`; só esses nomes, sessão obrigatória, ver em `GET /api/admin/events`). Não há tela de relatório: os cliques se leem nos eventos.
- Liberação: webhook com `checkout.id`, `orderbump[].id` ou `products[].id` igual ao `wiapyProductId` (ou título com os `titleHints`) de uma oferta LIGADA libera só aquela oferta. Manual: `POST /api/admin/grant` com `offers: ["kit-lucrativo"]`; CSV: coluna `ofertas` (ids separados por `|`).

Para ligar uma oferta: preencha `checkoutUrl` e `wiapyProductId`, cadastre o arquivo em `files`, suba o arquivo no armazenamento privado (`npm run upload:files`), preencha `cover` com o mockup e troque `enabled` para `true`. Para ver só o visual: no modo demonstração use "Ligar ofertas" da barra de teste.

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

1. Repositório GitHub e projeto na Vercel (conta do Levi). Definir `VITE_ACCESS_MODE=server` no build.
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
- Sem pontos, ranking ou sequências; só uma barra de progresso simples. Sem contador falso, sem escassez falsa, sem promessa de renda em número, sem depoimentos.
- Se o servidor não está configurado em produção, a tela mostra erro claro e nada é liberado.

## Pendências que dependem de contas

Veja `RELATORIO-FASE1.md` (fora desta pasta).
