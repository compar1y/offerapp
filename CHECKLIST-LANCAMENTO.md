# CHECKLIST DE LANÇAMENTO (app da Fábrica de Panetones)

Gerado por `npm run checklist:gen` a partir de `shared/catalog.ts` (ids e preços iguais aos do app). Sem dados reais de clientes e sem segredos: onde aparece uma variável, só o NOME.

Como ligar um botão de compra: criar o checkout na Wiapy, colar o link em `public/checkouts.json` no id indicado e trocar `ready` para `true` (só quando o PDF/produto já existir e estiver entregável). Sem link ou sem `ready:true` o app mostra "Disponível em breve" + "Quero ser avisada". Detalhes no `README.md`.

## 1. Checkouts da Wiapy a criar

### 1.1 Order bump

| id em `checkouts.json` | Produto | Preço | Feito (link colado) | `ready` |
|---|---|---|---|---|
| `bump` | +20 Fichas de Socorro do Panetone (id Wiapy do produto: ver README) | R$ 7,90 | [ ] | [ ] |

### 1.2 Combo "Leve tudo"

| id | Produto | Preço | Soma riscada (calculada) | Regra do botão | Feito | `ready` |
|---|---|---|---|---|---|---|
| `combo` | Leve tudo (17 materiais) | R$ 97,00 | R$ 557,20 | link + pelo menos 10 itens prontos | [ ] | [ ] |

"ou 12x" só aparece se `COMBO.comboInstallments = 12`; ligar depois que o Caixa confirmar o parcelamento na Wiapy.

### 1.3 Coleções (preço = soma dos itens x 0,65, arredondado para o valor mais próximo terminado em ,00 ou ,90)

| id | Coleção | Itens | Soma dos itens | Preço | Regra do botão | Feito | `ready` |
|---|---|---|---|---|---|---|---|
| `primeira-fornada` | Primeira Fornada | 2 | R$ 52,80 | R$ 34,00 | link + todos os itens prontos | [ ] | [ ] |
| `panetone-confeitaria` | Panetone de Confeitaria | 3 | R$ 93,70 | R$ 60,90 | link + todos os itens prontos | [ ] | [ ] |
| `ceia-completa` | Ceia Completa | 3 | R$ 88,90 | R$ 57,90 | link + todos os itens prontos | [ ] | [ ] |
| `presentes-que-vendem` | Presentes que Vendem | 3 | R$ 111,90 | R$ 72,90 | link + todos os itens prontos | [ ] | [ ] |
| `encomendas-dezembro` | Encomendas de Dezembro | 3 | R$ 131,00 | R$ 85,00 | link + todos os itens prontos | [ ] | [ ] |

### 1.4 As 17 ofertas do catálogo

| # | id em `checkouts.json` | Oferta | Preço sugerido | Entregável | `wiapyProductId` (preencher em `shared/catalog.ts`) | Link colado | PDF/arquivo no armazenamento privado | `ready` |
|---|---|---|---|---|---|---|---|---|
| 1 | `panetones-vulcao` | Panetones Vulcão: 15 Receitas de Dar Água na Boca | R$ 27,90 | Caderno de receitas | [ ] | [ ] | [ ] | [ ] |
| 2 | `panetones-vitrine` | Panetones de Vitrine: 25 Acabamentos de Luxo + Fotos que Dão Vontade | R$ 27,90 | Cartões de acabamento | [ ] | [ ] | [ ] | [ ] |
| 3 | `caixas-doces-natal` | Caixas de Doces de Natal: 30 brigadeiros e trufas gourmet que viram presente | R$ 37,00 | Pasta de imprimíveis | [ ] | [ ] | [ ] | [ ] |
| 4 | `segredo-recheios` | O Segredo dos Recheios que Fazem Qualquer Panetone Parecer de Confeitaria | R$ 37,90 | Fichário de receitas | [ ] | [ ] | [ ] | [ ] |
| 5 | `receitas-explodir-vendas` | 15 Receitas que VÃO EXPLODIR DE VENDAS a partir de dezembro | R$ 47,00 | Planilha interativa | [ ] | [ ] | [ ] | [ ] |
| 6 | `sobremesas-natal` | 20 Sobremesas de Natal com Panetone | R$ 37,00 | Cardápio imprimível | [ ] | [ ] | [ ] | [ ] |
| 7 | `ceia-doce` | Ceia Doce: 25 sobremesas de Natal e Ano Novo, sem panetone | R$ 27,00 | Calendário de parede | [ ] | [ ] | [ ] | [ ] |
| 8 | `mini-panetones` | Mini Panetones: Pequenos no Tamanho, Gigantes no Desejo | R$ 27,90 | Kit de moldes para recortar | [ ] | [ ] | [ ] | [ ] |
| 9 | `rabanada-padaria` | Rabanada de Padaria: 12 versões | R$ 24,90 | Vídeo-aulas | [ ] | [ ] | [ ] | [ ] |
| 10 | `doces-para-revender` | Doces de Natal para Revender: pacote Caixas + Lembrancinhas | R$ 47,00 | Kit de artes editáveis | [ ] | [ ] | [ ] | [ ] |
| 11 | `cesta-natal-caseira` | Kit de Presente Gourmet: Cesta de Natal Caseira | R$ 37,00 | Pasta de imprimíveis | [ ] | [ ] | [ ] | [ ] |
| 12 | `biscoitos-natal-decorados` | Biscoitos de Natal Decorados: do cortador ao saquinho | R$ 37,00 | Fichas de receita | [ ] | [ ] | [ ] | [ ] |
| 13 | `dia-producao-escala` | Dia de Produção em Escala: planilha e passo a passo | R$ 37,00 | Planilha interativa | [ ] | [ ] | [ ] | [ ] |
| 14 | `mesa-doce-ano-novo` | Mesa Doce de Ano Novo: sobremesas para a virada | R$ 27,00 | Cardápio imprimível | [ ] | [ ] | [ ] | [ ] |
| 15 | `chocotone-colher` | Chocotone e Panetone de Colher: 12 sobremesas instantâneas | R$ 24,90 | Cartões de receita | [ ] | [ ] | [ ] | [ ] |
| 16 | `natal-criancas` | Natal das Crianças: 20 Panetones que Viram Presentes Irresistíveis | R$ 24,90 | Caderno de receitas | [ ] | [ ] | [ ] | [ ] |
| 17 | `janeiro-panetone` | Janeiro Também Tem Panetone: 15 Sabores para Além do Natal | R$ 27,90 | Caderno de receitas | [ ] | [ ] | [ ] | [ ] |

Observação: o preço no checkout deve ser igual ao do app. Para vender por outro valor sem mexer em código, preencha `price` (centavos) no mesmo id em `checkouts.json`.

## 2. Outras pendências de produção

- [ ] Webhook da Wiapy: cadastrar `https://<dominio>/api/webhook/wiapy`, token no header `Authorization` (valor = `WIAPY_WEBHOOK_TOKEN`), marcar pagamento aprovado, PIX gerado, estornado e chargeback; pedido de teste com `WEBHOOK_LOG_RAW=1` e conferir o corpo em `GET /api/admin/events`.
- [ ] Confirmar na primeira venda de teste qual id vem em `checkout.id` (público `r2PHgYwK6CVi` ou interno do kit completo) e preencher `FULL_KIT_CHECKOUT_IDS` se precisar.
- [ ] Armazenamento de dados: Upstash Redis (variáveis `KV_REST_API_URL`, `KV_REST_API_TOKEN`). Sem isso o servidor responde 503 na Vercel.
- [ ] E-mail do código de acesso: Resend com domínio verificado (variáveis `RESEND_API_KEY`, `MAIL_FROM`).
- [ ] Variáveis de ambiente na Vercel (só os nomes aqui): `SESSION_SECRET`, `FILE_SIGNING_SECRET`, `WIAPY_WEBHOOK_TOKEN`, `ADMIN_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`, `BLOB_READ_WRITE_TOKEN` (ou `FILES_DIR` em desenvolvimento), `FULL_KIT_CHECKOUT_IDS` (opcional). Gerar segredos com `openssl rand -hex 32`, nunca em arquivo ou chat.
- [ ] PDFs pagos no Vercel Blob PRIVADO (`npm run upload:files`, conferir com `npm run check:files`). Nunca em `public/` nem no git.
- [ ] WhatsApp de suporte: trocar o placeholder em `src/data/config.ts` (campo `whatsapp`) pelo número real (DDI + DDD + número, só dígitos).
- [ ] Garantia de 7 dias: conferir o texto exibido no app contra o que está configurado em cada checkout da Wiapy.
- [ ] Checkout das +20 Fichas de Socorro (R$ 7,90) como order bump do kit e/ou avulso (id `bump`).
- [ ] Ligar o catálogo: `VITE_CATALOG_ENABLED=true` no build de produção e `COMBO.enabled` para o Leve tudo, SÓ quando o Levi mandar. Mínimos opcionais: `VITE_COMBO_MIN_AVAILABLE`, `VITE_COLLECTION_MIN_AVAILABLE`.
- [ ] Importar os clientes antigos (`POST /api/admin/import-csv`) e validar login, liberação e estorno com um pedido de teste real.
- [ ] Vercel: produção usa o Build Command padrão (`npm run build`). Uma prévia de demonstração precisa de `npm run build:preview`. Atenção: editar `public/checkouts.json` na Vercel exige um novo deploy estático (sem rebuild de lógica).
- [ ] Validar o primeiro deploy das funções da Vercel (limite de 12 funções no plano Hobby: já há 12).
- [ ] Textos finais de cada oferta (revisão do Levi) e conferir que nada promete renda em número.
- [ ] Antes de ligar: `npm run check` verde e abrir o app de produção em 390 px sem nenhum resto de demonstração (o build já falha se houver).
