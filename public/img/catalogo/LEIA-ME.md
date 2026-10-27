# Imagens do catálogo de ofertas

Um arquivo por oferta, com o id da oferta no nome: `public/img/catalogo/<id>.webp`

- Fundo TRANSPARENTE (mockup do produto). Nada de foto decorativa.
- Vertical 640x960 (proporção 2:3) ou horizontal 800x600 (4:3). Qual vale para cada oferta está em `shared/catalog.ts` (`imageRatio`), junto com o briefing do que mostrar (`imageType`).
- Peso ideal: até 80 KB cada (os 9 entregues pesam 134 a 203 KB; o conferidor só avisa acima de 300 KB).
- Prontos em 26/10/2026: vulcão, vitrine, caixas, recheios, 15 receitas, sobremesas, ceia doce, mini panetones, revender (todos 640x960).

Faixa dos bônus (só ofertas com bônus): `<id>-bonus.webp`, 900x300 (3:1), fundo transparente, com os mini-mockups dos 2 ou 3 bônus lado a lado.

Enquanto o arquivo não existe, o app mostra um placeholder discreto (só no modo demonstração). Para trocar:

1. Salve o arquivo aqui com o nome certo (ex.: `panetones-vulcao.webp`).
2. Rode `npm run catalogo:imagens`. Ele confere os arquivos, avisa se o formato ou o tamanho está errado e atualiza `src/data/catalog-images.json`.
3. `npm run check` e commit. (O `npm run build` já roda o passo 2 sozinho.)

Para ver a lista do que falta: `npm run catalogo:imagens`.
