# Regras fixas deste repositório (compar1y/offerapp)

App "Minha Fornada de Natal". Projeto na Vercel: **offerapp** (`prj_q1WVHlAyPyVxbiSY34c7oNS00A9Y`).
Domínio de produção: https://acessofabricadepanetones.vercel.app
A Vercel publica a `main` em produção sozinha a cada merge.

## Antes de qualquer tarefa

```sh
git fetch origin main
git checkout main
git pull --ff-only origin main
git checkout -b <branch-de-trabalho>
```

O fetch desta cópia às vezes baixa só a branch atual. Use sempre `git fetch origin main` explícito, nunca só `git fetch origin`.

## Ao terminar (com todos os testes passando)

1. Rode `npm run check` (tsc, vitest e build). Só siga se passar.
2. Abra o PR para a `main` e faça o merge (PR + merge).
3. Confira na Vercel que o deploy de produção do commit da `main` deu READY/success.
   Exemplo: `gh api repos/compar1y/offerapp/commits/<sha>/status` (contexto "Vercel" = success)
   ou `gh api "repos/compar1y/offerapp/deployments?sha=<sha>&environment=Production"`.
4. Confira que https://acessofabricadepanetones.vercel.app serve a versão nova:
   procure no HTML ou no bundle JS um texto ou trecho que só existe nessa mudança.
   Outra forma é comparar o nome do arquivo em `assets/` (hash do Vite) com o do build local do mesmo commit.
5. Reporte o commit, o deploy e a prova do domínio.

## Nunca

- Rodar SQL no banco de produção (Supabase). Mande o SQL exato para o Levi.
- Mexer em preço ou na Wiapy (checkouts, produtos, webhooks).
- Fazer compra de teste.
- Colocar segredos (chaves, tokens) no código, em commits ou no chat.
