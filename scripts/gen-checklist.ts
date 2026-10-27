// Gera CHECKLIST-LANCAMENTO.md a partir do catálogo (ids e preços sempre iguais aos do app). Sem dados reais nem segredos.
//   npm run checklist:gen   (grava CHECKLIST-LANCAMENTO.md na raiz do app; copie para app-cliente/ se quiser)
import { writeFile } from 'node:fs/promises'
import { BUMP, CHECKOUT_IDS, COMBO, OFFERS, OFFER_BY_ID, brl, comboSumCents, DEFAULT_COMBO_MIN_AVAILABLE } from '../shared/catalog.js'

const nb = (s: string) => s.replace(/\u00a0/g, ' ')
const offers = OFFERS.filter((o) => o.catalog && o.enabled)
const sum = comboSumCents(offers)
const L: string[] = []
L.push('# CHECKLIST DE LANÇAMENTO (app da Fábrica de Panetones)', '')
L.push('Gerado por `npm run checklist:gen` a partir de `shared/catalog.ts` (ids e preços iguais aos do app). Sem dados reais de clientes e sem segredos: onde aparece uma variável, só o NOME.', '')
L.push('Como ligar um botão de compra: criar o checkout na Wiapy, colar o link em `public/checkouts.json` no id indicado e trocar `ready` para `true` (só quando o PDF/produto já existir e estiver entregável). Sem link ou sem `ready:true` o app mostra "Disponível em breve" + "Quero ser avisada". Detalhes no `README.md`.', '')
L.push('## 1. Checkouts da Wiapy a criar', '')
L.push(`Contagem real de ids em \`public/checkouts.json\`: **${CHECKOUT_IDS.length}** = ${OFFERS.length} ofertas (${offers.length} na biblioteca + ${OFFERS.length - offers.length} fora da biblioteca, só para entrega e webhook) + combo + bump (a Conta da Fornada é uma das fora da biblioteca: ver 1.4). As coleções foram removidas do app. Para lançar a biblioteca bastam ${offers.length + 2} checkouts (${offers.length} ofertas + combo + bump).`, '')
L.push('### 1.1 Order bump', '', '| id em `checkouts.json` | Produto | Preço | Feito (link colado) | `ready` |', '|---|---|---|---|---|')
L.push(`| \`bump\` | +20 Fichas de Socorro do Panetone (id Wiapy do produto: ver README) | ${nb(brl(BUMP.priceCents))} | [ ] | [ ] |`, '')
L.push('### 1.2 Combo "Biblioteca completa" (antes "Leve tudo")', '', '| id | Produto | Preço | Soma riscada (calculada) | Regra do botão | Feito | `ready` |', '|---|---|---|---|---|---|---|')
L.push(`| \`combo\` | ${COMBO.title} (${offers.length} materiais) | ${nb(brl(COMBO.comboPriceCents ?? 0))} | ${nb(brl(sum))} | link + pelo menos ${DEFAULT_COMBO_MIN_AVAILABLE} itens prontos | [ ] | [ ] |`, '')
L.push('"ou 12x" só aparece se `COMBO.comboInstallments = 12`; ligar depois que o Caixa confirmar o parcelamento na Wiapy.', '')
L.push('', `### 1.3 As ${offers.length} ofertas do catálogo`, '', '| # | id em `checkouts.json` | Oferta | Preço sugerido | Entregável | `wiapyProductId` (preencher em `shared/catalog.ts`) | Link colado | PDF/arquivo no armazenamento privado | `ready` |', '|---|---|---|---|---|---|---|---|---|')
offers.forEach((o, i) => {
  L.push(`| ${i + 1} | \`${o.id}\` | ${o.title.replace(/\|/g, '/')} | ${nb(brl(o.priceCents))} | ${o.deliverableType ?? ''} | [ ] | [ ] | [ ] | [ ] |`)
})
L.push('', 'Observação: o preço no checkout deve ser igual ao do app. Para vender por outro valor sem mexer em código, preencha `price` (centavos) no mesmo id em `checkouts.json`.', '')
const tool = OFFER_BY_ID.calculadora
L.push('### 1.4 Ferramenta paga: Conta da Fornada (fora da biblioteca e do combo)', '', '| id em `checkouts.json` | Produto | Preço | Pagamento | Feito (link colado) | `ready` |', '|---|---|---|---|---|---|')
L.push(`| \`calculadora\` | Conta da Fornada | ${nb(brl(tool.priceCents))} | único, sem mensalidade | [ ] | [ ] |`, '')
L.push('Regras: a calculadora NÃO entra no combo "Biblioteca completa" (o combo não a inclui e a soma riscada não a conta) e NÃO conta para o mínimo de itens prontos do combo. Ela abre antes das outras ofertas: pode ser a única com `ready:true`.', '')
L.push('A venda é liberada pelo webhook da Wiapy. O app reconhece o item `calculadora` pelo `checkout.id` (público ou interno), lido de: `wiapyProductId` da oferta, do código do link em `public/checkouts.json` (`calculadora.checkoutUrl`) e da variável `CALC_CHECKOUT_IDS` (lista separada por vírgula). Valor esperado: `CALC_AMOUNT_CENTS` (padrão 1990); valor diferente só gera o evento `purchase.amount_mismatch`, não bloqueia.', '')
L.push('Itens a confirmar na Wiapy antes de ligar (`ready:true`):', '', '- [ ] Criar o produto digital **sem arquivo** (a entrega é o acesso no app) e o checkout "Conta da Fornada" de R$ 19,90, pagamento único.', '- [ ] Conferir se o checkout consegue **pré-preencher o e-mail** da cliente (para o acesso cair no e-mail com que ela entra no app).', '- [ ] Pedido de teste: pago libera a ferramenta; estorno e chargeback tiram só a ferramenta (os dados dela ficam); repetido não duplica.', '- [ ] Anotar qual `checkout.id` chega no webhook (público ou interno) e colocar em `CALC_CHECKOUT_IDS` se não bater com o link.', '')
L.push('## 2. Outras pendências de produção', '')
const todo = [
  'Webhook da Wiapy: cadastrar `https://<dominio>/api/webhook/wiapy`, token no header `Authorization` (valor = `WIAPY_WEBHOOK_TOKEN`), marcar pagamento aprovado, PIX gerado, estornado e chargeback; pedido de teste com `WEBHOOK_LOG_RAW=1` e conferir o corpo em `GET /api/admin/events`.',
  'Confirmar na primeira venda de teste qual id vem em `checkout.id` (público `r2PHgYwK6CVi` ou interno do kit completo) e preencher `FULL_KIT_CHECKOUT_IDS` se precisar.',
  'Armazenamento de dados: Upstash Redis (variáveis `KV_REST_API_URL`, `KV_REST_API_TOKEN`). Sem isso o servidor responde 503 na Vercel.',
  'E-mail do código de acesso: Resend com domínio verificado (variáveis `RESEND_API_KEY`, `MAIL_FROM`).',
  'Variáveis de ambiente na Vercel (só os nomes aqui): `SESSION_SECRET`, `FILE_SIGNING_SECRET`, `WIAPY_WEBHOOK_TOKEN`, `ADMIN_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`, `BLOB_READ_WRITE_TOKEN` (ou `FILES_DIR` em desenvolvimento), `FULL_KIT_CHECKOUT_IDS` (opcional). Gerar segredos com `openssl rand -hex 32`, nunca em arquivo ou chat.',
  'PDFs pagos no Vercel Blob PRIVADO (`npm run upload:files`, conferir com `npm run check:files`). Nunca em `public/` nem no git.',
  'WhatsApp de suporte: trocar o placeholder em `src/data/config.ts` (campo `whatsapp`) pelo número real (DDI + DDD + número, só dígitos).',
  'Garantia de 7 dias: conferir o texto exibido no app contra o que está configurado em cada checkout da Wiapy.',
  'Checkout das +20 Fichas de Socorro (R$ 7,90) como order bump do kit e/ou avulso (id `bump`).',
  'Ligar o catálogo: `VITE_CATALOG_ENABLED=true` no build de produção e `COMBO.enabled` para a Biblioteca completa, SÓ quando o Levi mandar. Mínimo opcional: `VITE_COMBO_MIN_AVAILABLE`.',
  'Importar os clientes antigos (`POST /api/admin/import-csv`) e validar login, liberação e estorno com um pedido de teste real.',
  'Vercel: produção usa o Build Command padrão (`npm run build`). Uma prévia de demonstração precisa de `npm run build:preview`. Atenção: editar `public/checkouts.json` na Vercel exige um novo deploy estático (sem rebuild de lógica).',
  'Validar o primeiro deploy das funções da Vercel (limite de 12 funções no plano Hobby: agora são 10, com as 4 rotas admin juntas em `api/admin/[action].ts` e a `api/calc/[action].ts`).',
  'Textos finais de cada oferta (revisão do Levi) e conferir que nada promete renda em número.',
  'Conta da Fornada: confirmar com o Levi o texto de privacidade e a garantia de 7 dias; a sincronização guarda as contas dela no Upstash (chaves `calc:*`), então vale conferir o plano do Redis. `VITE_CALC_ENABLED=false` esconde a ferramenta no app sem mexer em código.',
  'Antes de ligar: `npm run check` verde e abrir o app de produção em 390 px sem nenhum resto de demonstração (o build já falha se houver).',
]
todo.forEach((t) => L.push(`- [ ] ${t}`))
L.push('')
await writeFile(new URL('../CHECKLIST-LANCAMENTO.md', import.meta.url), nb(L.join('\n')))
console.log('gravado CHECKLIST-LANCAMENTO.md')
