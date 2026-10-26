# Imagens do app

Cada bloco tracejado no app é uma imagem que falta. Para preencher:

1. Gere a imagem no tamanho da tabela e salve em `public/img/<id>.webp`.
2. Em `src/data/images.ts`, preencha `src` daquele id com `'img/<id>.webp'`.
3. Rode `npm run build` para conferir.

Regras: fotos com luz natural e cara de cozinha de casa brasileira, nada de cozinha profissional. Mockups com capa legível no celular. Nenhuma imagem pode mostrar dinheiro, valores de renda ou promessa de ganho.

| id | Onde aparece | O que mostrar | Tamanho (px) |
| --- | --- | --- | --- |
| `login-hero` | Tela de entrada | Panetone caseiro cortado, mesa de Natal | 1200 x 900 |
| `boas-vindas` | Boas-vindas | Capa do vídeo de boas-vindas | 1280 x 720 |
| `inicio-hero` | Início, topo | Mãos tirando panetone do forno | 1280 x 560 |
| `receita-tradicional` | Card da receita no início e topo da receita | Foto: panetone tradicional de frutas | 1200 x 900 |
| `receita-chocotone` | Card da receita no início e topo da receita | Foto: chocotone de gotas | 1200 x 900 |
| `receita-trufado` | Card da receita no início e topo da receita | Foto: panetone trufado no pote | 1200 x 900 |
| `mockup-bonus` | Card do material no início (com cadeado se bloqueado) e topo do módulo | Mockup: e-book Bônus da Fornada | 1200 x 900 |
| `mockup-guia` | Card do material no início (com cadeado se bloqueado) e topo do módulo | Mockup: Kit Panetone Lucrativo (e-book + celular) | 1200 x 900 |
| `mockup-essencial` | Card do material no início (com cadeado se bloqueado) e topo do módulo | Mockup: Kit Panetone Lucrativo Essencial | 1200 x 900 |
| `oferta-guia` | Topo da página de oferta e banner de oferta | Mockup grande do Kit com panetones embalados | 1080 x 1080 |
| `oferta-essencial` | Topo da página de oferta e banner de oferta | Mockup grande do Kit Essencial | 1080 x 1080 |
| `oferta-bonus` | Topo da página de oferta e banner de oferta | Mockup grande do Bônus da Fornada com recheios | 1080 x 1080 |
| `aula-preco` | Card da aula e topo da aula | Ilustração: calculadora e panetone com etiqueta de preço | 1280 x 720 |
| `aula-oferecer` | Card da aula e topo da aula | Ilustração: vizinhos e colegas recebendo panetone | 1280 x 720 |
| `aula-whatsapp` | Card da aula e topo da aula | Mockup: conversa de WhatsApp com encomenda | 1280 x 720 |
| `aula-encomendas` | Card da aula e topo da aula | Ilustração: caderno de encomendas de dezembro | 1280 x 720 |
| `aula-apresentacao` | Card da aula e topo da aula | Foto: panetone embalado para presente | 1280 x 720 |
| `aula-recheios` | Card da aula e topo da aula | Foto: 5 potes de recheio | 1280 x 720 |
| `aula-embalagens` | Card da aula e topo da aula | Foto: panetone em celofane com laço | 1280 x 720 |
| `pagamento-ok` | Pagamento confirmado | Ilustração: presente aberto com o kit dentro | 1280 x 720 |

Total: 20 imagens.
