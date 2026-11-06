# Montador de Ads (v1)

App instalável (PWA) pra montar anúncios em vídeo 9:16 no celular a partir do que já validou.
Roda inteiro no aparelho: sem servidor, sem conta, sem segredo no código.

## O que faz
- **Projetos**: um por oferta (prefixo do nome, produto, ticket, CPA ideal). Panetone caseiro vem como o primeiro, com o banco de hooks de 26 a 29/10/2026.
- **Biblioteca com métricas**: takes, hooks, bodies, CTAs, avatares e ads. Os números lançados em cada ad (gasto, impressões, hook rate, IC, vendas, CTR) sobem pra tudo que entrou nele: o take mostra vendas, CPA, custo por IC e hook rate dos ads em que apareceu.
- **Molde "quem duvidou"**: escolhe quem duvidou, o app gera 4 hooks (com banner) usando o produto do projeto, monta hook + body + CTA e já sugere takes pela cena.
- **Trocar take com 1 toque**: lista ordenada por "sugerido pra cena" e por desempenho.
- **Take com avatar (Flow)**: o Flow não tem API, então o app gera o prompt (ficha fixa do avatar em inglês + fala em português), você cola no Flow, baixa o vídeo e sobe no pedido: ele encaixa sozinho no trecho.
- **Voz ElevenLabs**: chave fica só no aparelho (localStorage). Usa `with-timestamps`, então a legenda segue o tempo de cada palavra.
- **Legenda, banner e texto na tela** desenhados no vídeo; seta no CTA.
- **Checagem antes de subir**: hook ≤ 15 palavras, número de renda, teste do mudo, e alerta quando o ad repete avatar + formato + take de abertura de outro ad (pro leilão é o mesmo ad).
- **Exportar**: grava em tempo real no aparelho (MediaRecorder) com nome `prefixo-mp##-ang##-fmt##-av##-var-###` e registra o ad na biblioteca.

## Limites conhecidos da v1
- Dados ficam no aparelho onde foram criados (celular e notebook não sincronizam). Use Ajustes › Backup pra levar textos e métricas.
- O vídeo é gravado em tempo real: um ad de 80 s leva 80 s, com a tela ligada.
- Chrome no Android grava MP4 (H.264). Onde o navegador só grava WebM, o app avisa.
- A chamada ao ElevenLabs sai direto do navegador; não foi testada com chave real.

## Rodar localmente
```
cd montador && python3 -m http.server 8080
```
Abra http://localhost:8080. Pra instalar no celular precisa estar num endereço https.
