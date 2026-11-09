# App da Fornada

Área de membros gamificada da **Fábrica de Panetones Caseiros**. É um PWA: a cliente instala na tela do celular e lê tudo dentro do app.

## O que tem

- **Login só com o e-mail da compra**, sem senha. A sessão fica num cookie assinado e dura 90 dias.
- **Liberação automática pela Wiapy.** O webhook libera:
  - o kit;
  - o bump dos Recheios;
  - o upsell Encomenda Puxa Encomenda;
  - o downsell A Primeira Encomenda.

  PIX pendente aparece como "aguardando". Estorno e chargeback tiram o acesso.
- **Leitor de páginas** com as 383 páginas dos PDFs. Elas ficam num armazenamento privado e abrem por link temporário de 1 hora. As 100 receitas têm busca, e o SOS Massa abre a ficha certa para cada problema.
- **Onboarding com 5 perguntas** que leva a 5 perfis. Cada perfil tem a sua primeira missão e a sua ordem de ofertas.
- **Jornada até o Natal:** 5 etapas e 21 lições. Tudo o que ela comprou fica aberto, e a ordem é só sugestão.
- **Gamificação:**
  - Fornada do Dia com 3 missões;
  - Fornadas Seguidas;
  - Moedas Douradas;
  - Presentes de Natal: prata, ouro, diamante e cristal;
  - Ingrediente Secreto, uma raspadinha ao fim de cada etapa;
  - missão secreta da semana;
  - Lojinha;
  - Conquistas.

  Não tem ranking, liga nem feed de outras pessoas.
- **Ofertas dentro do app:**
  - um card no painel;
  - uma oferta ao fim das etapas 1, 4 e 5;
  - o downsell, que aparece quando ela recusa a Encomenda Puxa Encomenda.

  Toda oferta mostra uma página curta antes do checkout da Wiapy. O pagamento abre em outra aba e, quando ela volta, o app confere se a compra liberou.
- **Painel do dono** em `/#painel`:
  - perfis;
  - onde as clientes param;
  - ofertas vistas, clicadas, recusadas e compradas por perfil;
  - SOS e receitas mais abertos;
  - liberar acesso manual;
  - importar compradoras antigas.

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/` | as telas (React) |
| `shared/` | catálogo, conteúdo e regras do jogo, usados pelo app e pelo servidor |
| `server/` e `api/` | funções da Vercel |
| `supabase/schema.sql` | tabelas e armazenamento privado |
| `scripts/subir-paginas.mjs` | envia as páginas WebP para o armazenamento |

## Variáveis de ambiente (na Vercel, nunca no código)

| Nome | Para quê |
|---|---|
| `SESSION_SECRET` | assinar o cookie de login (texto aleatório longo) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | banco e armazenamento |
| `WIAPY_WEBHOOK_TOKEN` | o mesmo token cadastrado no webhook da Wiapy |
| `ADMIN_TOKEN` | chave do painel `/#painel` |
| `WEBHOOK_GUARDAR_BRUTO` | `1` guarda o corpo do webhook sem dados pessoais (para conferir o formato no primeiro pedido) |
| `CHECKOUT_IDS_KIT` e as outras `CHECKOUT_IDS_*` | ids extras de checkout, se a Wiapy mandar outro id |
| `BUMP_RECHEIOS_IDS` | id do bump, se precisar |
| `VITE_AULAS_VIDEO_BASE_URL` | pasta pública dos 25 `.mp4` das aulas em vídeo (build do app, não é segredo). Vazio = a lista aparece e o player avisa "vídeo sendo preparado" |

## Aulas em vídeo

- 25 aulas curtas, verticais, em 4 módulos (`shared/aulas.ts`): Panetone tradicional (10), Chocotone (8), Recheios e versões especiais (4), Panetone salgado (3).
- **Vídeos dentro do app:** os 25 `.mp4` ficam em `public/aulas/aula-01.mp4 … aula-25.mp4` (na ordem de `shared/aulas.ts`) e são servidos em `/aulas/<nome>`. Sem serviço externo, sem YouTube, sem embed. `VITE_AULAS_VIDEO_BASE_URL` só troca a pasta (fora do app o portão não protege); `off` esconde os vídeos ("sendo preparado").
- **Protegidos:** `middleware.ts` (Vercel Routing Middleware) só entrega `/aulas/*` para quem está logada e comprou as Videoaulas. Sem login 401, sem compra 403.
- **Quem vê (flag `VITE_AULAS_ACESSO`):** padrão = só quem comprou a oferta Videoaulas (produto `videoaulas`, R$ 19,90, checkout `6af1e13a04a3ce9b11749472`). `VITE_AULAS_ACESSO=kit` libera para quem tem o kit e esconde a oferta (o middleware lê a mesma variável).
- Player em tela cheia (`src/telas/Aulas.tsx`, sem o menu de baixo): botão grande de assistir/pausar, barra arrastável, anterior/próxima, "Já assisti" e retoma de onde parou (tempo no aparelho, em `fornada-aulas:v1:<email>`).
- Jogo: aula assistida entra em `estado.aulas` no servidor, vale 🪙 5 uma vez por aula e conta a missão do meio da Fornada do Dia (`assistirAula` em `shared/jogo.ts`). Rever não paga de novo.
- Testar no celular sem publicar: `VITE_DEMO=1 npx vite --host` e abra no celular o endereço "Network" do terminal (mesmo Wi-Fi). Na prévia, o botão de compra das Videoaulas libera na hora.

## Baixar PDF e planilha

- Os 16 arquivos (PDFs de cada material, a planilha do bônus 05 e a do Caderninho) ficam em `public/downloads/`. A lista e quem pode baixar cada um estão em `shared/acesso.ts` (`ARQUIVOS`).
- `middleware.ts` confere o cookie de sessão e a compra antes de entregar `/downloads/*`; o `vercel.json` responde com `Content-Disposition: attachment`. Sem login 401, sem compra 403, servidor sem configuração 503 (fecha, nunca abre).
- No leitor de cada material aparecem "Baixar PDF" e/ou "Baixar planilha". Android e iPhone no Safari: download direto, a cliente fica na mesma tela. iPhone com o app instalado: o app busca o arquivo e abre o "Compartilhar" para "Salvar em Arquivos".
- Conferir depois de publicar: `curl -I <app>/downloads/ebook-100-receitas.pdf` sem cookie tem que dar **401**, e `curl -I <app>/aulas/aula-01.mp4` também.

## Imagens e Etiquetas com o Seu Nome (R$ 12,90)

- Produto `etiquetas` em `shared/catalogo.ts`. Os códigos da Wiapy ficam em `ETIQUETAS_WIAPY` (checkoutUrl, checkoutIds, produtoIds) e estão **vazios**: enquanto o `checkoutUrl` estiver vazio, o card e a tela de venda não aparecem.
- Antes de ligar a venda: rodar `supabase/migracao-2026-11-09b-etiquetas.sql` (a tabela de compras passa a aceitar `etiquetas`).
- Entrega (`src/telas/Etiquetas.tsx`, só para quem tem `etiquetas`): ela digita nome e WhatsApp e o app desenha no celular (`src/etiquetas.ts`) 6 imagens (3 Status 9:16, 3 quadradas) e um PDF A4 de 6 páginas com linhas de corte. Salvar: `src/salvar.ts` (download direto; no iPhone com o app instalado, Compartilhar).
- Foto real da oferta: salvar em `public/img/mockups/etiquetas-foto.webp` e preencher `FOTO_ETIQUETAS` em `src/telas/Etiquetas.tsx`.

## Colocar no ar (só com a ordem do dono)

1. Criar o projeto no Supabase e rodar `supabase/schema.sql` no SQL Editor.
2. Rodar `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run subir:paginas -- <pasta das páginas>`.
3. Criar o projeto na Vercel a partir deste branch e preencher as variáveis acima.
4. Na Wiapy, cadastrar o webhook `https://<domínio>/api/webhook/wiapy` com o token.
5. Fazer uma compra de teste e conferir no `/#painel`.
6. Importar as compradoras antigas pelo painel.

## Desenvolvimento

```
npm install
npm run check   # tipos + testes
npm run build
```
