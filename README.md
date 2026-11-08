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
