// Gera COMUNICACAO-OFERTAS.md a partir do catálogo: os textos do app vivem em shared/catalog.ts (COPY, OFFER_COPY, HOOKS)
// e este documento é só a leitura deles. Sem dados reais de clientes e sem segredos.
//   npm run comunicacao:gen   (grava COMUNICACAO-OFERTAS.md na raiz do app; copie para app-cliente/)
import { writeFile } from 'node:fs/promises'
import { BRANCHES, CHALLENGES, DAILY_GOALS, EXTRAS, GAME_TEXT, LEVELS, PF, PHRASES, SOCORRO_TIPOS, STATIC_SEALS, emptyGame, statsOf } from '../shared/game.js'
import { BUMP, COMBO, COPY, HOOKS, OFFERS, TRACKS, brl, unlockPrice, comboSumCents, offerCopy } from '../shared/catalog.js'

const nb = (s: string) => s.replace(/\u00a0/g, ' ')
const esc = (s: string) => s.replace(/\|/g, '/')
const offers = OFFERS.filter((o) => o.catalog && o.enabled)
const L: string[] = []
const w = (...x: string[]) => L.push(...x)

w('# COMUNICAÇÃO DAS OFERTAS (app da Fábrica de Panetones)', '')
w('Gerado por `npm run comunicacao:gen` a partir de `shared/catalog.ts`. **Os textos moram só no catálogo** (`COPY`, `OFFER_COPY`, `COLLECTION_COPY`, `HOOKS`, `offerContextFor`); o app e este documento leem de lá, sem duplicar. Para mudar uma frase, edite o catálogo e rode o gerador.', '')
w('## 1. Princípios', '')
w('- Ordem de cada card e de cada detalhe: **situação da cozinha, pergunta ou necessidade, como ajuda, e só depois o preço**. O preço é discreto na lista e claro no detalhe e no checkout.')
w('- Áreas chamadas de **Biblioteca**, **Seu caminho** e **Para você**. Nada de "compre", "oferta" ou "desconto" em destaque.')
w('- Botão verde "Desbloquear por R$ X" (pulso suave, desligado com prefers-reduced-motion) nos cards e no detalhe: abre o checkout direto quando há link e ready:true. O preço fica só no botão na lista, e grande no detalhe. Sem pronto: "Disponível em breve" parado (sem pulso) + "Quero ser avisada". Material pago ainda não adquirido tem cadeado 🔒 na capa ("Bloqueado, desbloqueie para acessar"); quem já tem vê "Acessar" e nenhum cadeado. Nada de contagem regressiva, "últimas" ou urgência.')
w('- Honestidade: sem depoimento inventado, sem estatística ("90% das alunas"), sem escassez nem relógio falso, sem promessa de renda. "O próximo passo natural depois do Vulcão" é sugestão de caminho, não número.')
w('- Contexto vem de dados reais do app: "Fiz essa", "Marcar como visto", itens que a pessoa já tem (progresso da trilha). Sem contexto, vale a frase de necessidade da oferta.')
w('- Pendente não libera, pago libera uma vez, estorno revoga (regras do ANEXO-LEVI.md não mudaram).', '')

w('## 2. Navegação, seções e botões', '')
w('| Onde | Texto |', '|---|---|')
w(`| Navegação inferior | ${COPY.nav.home} / ${COPY.nav.library} / ${COPY.nav.journey} / ${COPY.nav.account} |`)
w(`| Título da área | ${COPY.library.title} |`, `| Texto de abertura | ${esc(COPY.library.lead)} |`)
w(`| Destaque no topo da lista | ${COPY.sections.forYou} |`)
w(`| Fichas de Socorro (seção) | ${COPY.sections.rescue} |`, `| Texto da seção | ${esc(COPY.sections.rescueLead)} |`, `| Produtos que a pessoa já tem | ${COPY.sections.mine} |`)
w(`| Botão do card, da lista e do detalhe (com checkout pronto) | **${COPY.button.unlock('R$ X')}** (abre o checkout; pulso suave) |`, `| Botão da biblioteca completa | **${COPY.button.unlockAll('R$ 97')}** |`, `| Cadeado na capa (material não adquirido) | 🔒 "${COPY.button.locked}" |`, `| Link de gancho "próximo passo" | ${COPY.button.card}: nome do material (leva ao detalhe) |`)
w(`| Chamada para ver a biblioteca completa | ${COPY.button.comboSee} |`)
w(`| Item que a pessoa já tem | ${COPY.button.open} |`, `| Ainda sem checkout pronto | ${COPY.button.soon} + ${COPY.button.notify} (depois: ${COPY.button.notified}) |`)
w(`| Notas de preço | ${COPY.price.once} / ${COPY.price.planned} / ${COPY.price.sum} (soma riscada só no detalhe) |`)
w(`| Rótulo de sugestão de caminho | ${COPY.hookLabel} |`, '')

w('## 3. Contexto do card (o que a pessoa acabou de fazer)', '')
w('Prioridade: fez algo relacionado, trilha em andamento, marcou algo como visto, sem contexto.', '')
w('| Situação | Rótulo (exemplo) |', '|---|---|')
w(`| Fiz essa | ${COPY.context.done('Fábrica de Panetones Caseiros')} |`, `| Trilha em andamento | ${COPY.context.trail('Panetone de confeitaria', 1, 4)} (texto: o gancho do passo seguinte, ver seção 4) |`)
w(`| Marcou como visto | ${COPY.context.opened('Cardápio e Fotos')} |`, `| Sem contexto | frase de necessidade da oferta (seção 5) |`, '')

w('## 4. Ganchos de caminho (sugestão, não estatística)', '', '| De | Para | Tipo | Texto |', '|---|---|---|---|')
for (const h of HOOKS) w(`| ${h.from} | ${h.to} | ${h.kind} | ${esc(h.text)} |`)
w('', 'Trilhas: ' + TRACKS.map((t) => `${t.title} (${t.steps.map((s) => s.offer).join(' > ')})`).join('; ') + '.', '')

w(`## 5. Texto de cada oferta (${offers.length})`, '')
w('Para cada uma: necessidade (card sem contexto), como ajuda (segunda linha), pergunta da cozinha (abre o detalhe), contexto depois de "Fiz essa", contexto depois de "visto", e o convite.', '')
for (const o of offers) {
  const c = offerCopy(o.id)
  w(`### ${o.title} (\`${o.id}\`, ${nb(brl(o.priceCents))})`, '')
  w(`- **Necessidade (sem contexto):** ${c.need}`, `- **Como ajuda (card):** ${c.cardLine}`, `- **Pergunta da cozinha (detalhe):** ${c.question}`)
  w(`- **Relacionados (dão contexto):** ${c.relatesTo.join(', ') || 'nenhum'}`, `- **Depois de "Fiz essa":** ${c.afterDone}`, `- **Depois de marcar como visto:** ${c.afterOpened}`)
  w(`- **Botão:** "${COPY.button.unlock(nb(unlockPrice(o.priceCents)))}" (cadeado 🔒 na capa até desbloquear)`, '')
}
w(`### Fichas de Socorro (order bump, ${nb(brl(BUMP.priceCents))})`, '')
w(`- **Necessidade:** ${COPY.bump.need}`, `- **Como ajuda (card):** ${COPY.bump.cardLine}`, `- **Pergunta da cozinha:** ${COPY.bump.question}`, `- **Depois de "Fiz essa":** ${COPY.bump.afterDone}`, `- **Depois de marcar como visto:** ${COPY.bump.afterOpened}`, '')

w('## 6. Biblioteca completa (antes "Leve tudo")', '')
w(`- Título: ${COMBO.title}. Necessidade: ${COPY.combo.need}`, `- Curta: ${COPY.combo.short}`, `- Preço: ${nb(brl(COMBO.comboPriceCents ?? 0))}; valor somado dos itens (só no detalhe): ${nb(brl(comboSumCents(offers)))}.`)
w(`- Botões: ${COPY.button.unlockAll(nb(unlockPrice(COMBO.comboPriceCents ?? 0)))}, ${COPY.button.comboSee}, "${COPY.combo.detailsOpen(offers.length)}", roleta "${COPY.combo.spin}". Nota da roleta: ${COPY.combo.wheelNote}`, '')

w('## 7. Estilo de referência', '')
w('Inspiração visual: a página pública https://fabricadepanetones.vercel.app/ (que o Levi acha bonita). HTML, CSS e JS foram baixados com curl e a página foi fotografada em 390x844 para comparar. **Só o estilo foi usado: nenhum texto e nenhuma imagem da página foi copiado.**', '')
w('**Paleta extraída (tokens em `src/index.css`, bloco "VISUAL v4")**', '')
w('| Token | Cor | Uso |', '|---|---|---|')
for (const r of [
  ['`--bg`', '#FFFBF8', 'fundo creme'],
  ['`--bg-alt`', '#FDF1EE', 'faixas alternadas'],
  ['`--text` (ink)', '#24170F', 'texto'],
  ['`--muted`', '#6E625B', 'texto de apoio (5,9:1 sobre o fundo)'],
  ['`--line`', '#EADFDA', 'bordas de 1px'],
  ['`--accent` (red)', '#C1121F', 'rótulos pequenos, pontinho vermelho'],
  ['`--red-soft`', '#F7DCDD', 'fundo de selo'],
  ['`--green`', '#1E9E5A', 'borda do destaque e detalhes'],
  ['`--ok-soft` (green-soft)', '#E6F4EC', 'fundo suave verde'],
  ['`--gold`', '#C9A04F', 'filete do contexto e destaques'],
  ['`--gold-soft`', '#F6EEDC', 'fundo de selo dourado'],
  ['`--brand` (wine)', '#2A1212', 'barra do topo'],
  ['`--card`', '#FFFFFF', 'cards'],
]) w(`| ${r[0]} | ${r[1]} | ${r[2]} |`)
w('', '**Ajustes de acessibilidade em relação à referência** (a referência usa branco sobre #1E9E5A, que dá cerca de 3,4:1, abaixo do mínimo AA): `--open` #17704A com texto branco (6,1:1) para "Acessar"; `--buy` #34B85A com tinta escura #06240F (6,4:1) para "Ver como ajuda" e "Quero isso". Texto dourado em #7A5A18. Os botões principais continuam VERDES.', '')
w('**Tipografia:** Outfit (família da referência, licença OFL), variável 100-900, subconjunto latino em `public/fonts/outfit-latin-wght.woff2`, `font-display: swap`, fallback "Segoe UI", system-ui. Sem Google Fonts em runtime. A licença está em `public/fonts/Outfit-OFL-LICENSE.txt`. Substituiu a Inter. Pesos: títulos 800, botões 800, selos 700, texto 400/500. Corpo 17px, h1 2,1rem (34 a 36px), título de card 1,5rem, linha 1,55 no texto e 1,08 a 1,2 nos títulos, `text-wrap: balance`.', '')
w('**Formas e espaçamento:** cards com raio 22px, borda 1px `--line`, sombra mínima `0 6px 16px rgba(42,18,18,.06)`; destaque com borda de 2px verde #1E9E5A; selos e botões em pílula (raio 999px); botão com sombra verde suave `0 8px 18px rgba(30,158,70,.25)` e SEM caixa alta (a referência usa caixa alta; no app o tom é de convite); espaço entre seções de 48px; faixas alternadas em `--bg-alt`; caixa de contexto com filete dourado à esquerda; foco visível em dourado.', '')
w('**O que não foi copiado:** textos, imagens, ilustrações, estrutura de vendas da página. Também não foi usado nenhum elemento de escassez ou contagem regressiva.', '')

// ---- gamificação (Minha fornada): textos que a cliente vê
w('', '## Gamificação: Minha fornada (textos e regras visíveis)', '')
w('Gerado de `shared/game.ts`. Pontos só por ação que a cliente marca; nada de dinheiro, sorteio, prêmio simulado, punição ou escassez. Dados só no aparelho.', '')
w('**Avisos honestos fixos:**', '')
for (const k of ['pontos', 'extras', 'encomendas', 'privacidade'] as const) w(`- ${GAME_TEXT[k]}`)
w('', '**Níveis:** ' + LEVELS.map((l) => `${l.name} (${l.min} PF)`).join(', ') + '. O nível nunca desce.', '')
w('**Tabela de PF:** ' + Object.entries(PF).map(([k, v]) => `${k} ${v}`).join(', ') + '. Teto: 60 PF por dia (vale para tudo). Desafios: 3 por semana, 20 PF cada + 30 PF por fechar os 3 (máximo 90 PF por semana).', '')
w('**Ramos de habilidade:** ' + BRANCHES.map((b) => b.name).join(', ') + ' (3 níveis: Iniciante, Segura, Craque).', '')
w('**Desafios da semana (lista fixa):**', '')
for (const c of CHALLENGES) w(`- ${c.txt}${c.needsBump ? ' (só com as Fichas de Socorro)' : ''}`)
w('', '**Meta do dia (lista fixa):**', '')
for (const g of DAILY_GOALS) w(`- ${g}`)
w('', '**Selos:**', '', '| Selo | Como ganha |', '|---|---|')
for (const sd of STATIC_SEALS) w(`| ${esc(sd.name)} | ${esc(sd.how)} |`)
w(`| (um por receita) | Toque em "Fiz essa" no material |`, `| Receita de casa (dourado) | Faça a mesma receita 3 vezes |`)
w('', '**Salvei a fornada (Fichas de Socorro):** ' + SOCORRO_TIPOS.map((t) => t.name).join(', ') + '.', '')
w('**Extras liberados por progresso** (nunca por gastar PF; nada do que foi comprado fica trancado):', '')
for (const e of EXTRAS) w(`- ${e.kind}: ${e.title} (libera em ${LEVELS[e.level].name})`)
w('', '**30 frases de incentivo (cada uma só aparece com um fato real do uso da cliente):**', '')
const sample = { ...statsOf(emptyGame('2026-01-05'), '2026-01-05'), semana: 3, hoje: 1, total: 10, dias: 3, fotos: 2, notas: 2, selos: 5, socorros: 1, encomendas: 2, entregues: 2, nivel: 1 }
for (const ph of PHRASES) w(`- ${ph.text(sample)}`)
w('')
await writeFile('COMUNICACAO-OFERTAS.md', L.join('\n') + '\n')
console.log(`COMUNICACAO-OFERTAS.md gerado (${offers.length} ofertas)`)
