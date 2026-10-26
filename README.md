# offerapp

Web app das clientes da Fábrica de Panetones: área de membros com as receitas, o bônus do order bump e o guia de vendas, com upsell e downsell dentro do app.

## Rodar

```bash
npm install
npm run dev
```

## Estado atual

Modo demonstração (`CONFIG.demo` em `src/data/config.ts`): qualquer e-mail entra com o código `123456` e o pagamento é simulado. Tudo fica no navegador.

Falta ligar: login por código no e-mail (Supabase), webhook de pagamento da Wiapy, links de checkout e conteúdo real do e-book, do bônus e do guia.

## Onde mexer

- `src/data/config.ts`: produtos, preços, links de checkout, WhatsApp de suporte
- `src/data/content.ts`: receitas, módulos e textos das ofertas
- `src/lib/store.ts`: acesso, compras, progresso e eventos; é a peça trocada pelo servidor na integração

## Imagens

Os blocos tracejados são imagens que faltam. A lista com o que cada uma mostra, o tamanho e onde aparece está em [IMAGENS.md](IMAGENS.md). O arquivo vai em `public/img/` e o caminho em `src/data/images.ts`.
