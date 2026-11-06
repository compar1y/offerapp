/* Dados iniciais do primeiro projeto (Panetone), tirados do banco de hooks
   (criativos/banco-de-hooks-panetone.xlsx, números de 26 a 29/10/2026, câmbio R$5,43/US$).
   Os takes são fichas de exemplo montadas a partir da descrição do HK-001:
   o vídeo real é vinculado pelo próprio app. */
window.SEED_PANETONE = (function () {
  const BODY_001 = [
    ['Ele pegou meu celular pra conferir e perguntou se aquilo tudo era dos panetones.', 'celular'],
    ['Era o pagamento de uma encomenda de chocotones recheados, feitos aqui na minha cozinha.', 'celular'],
    ['Até então, ele viu os ingredientes na bancada e achava que eu tava arrumando mais uma coisa pra gastar dinheiro.', 'ingredientes'],
    ['Eu também tava começando, então resolvi escolher uma receita, fazer e mostrar como ficava.', 'preparo'],
    ['Olha esse de brigadeiro por dentro. A massa com gotas de chocolate, o recheio cremoso.', 'recheio'],
    ['Eu tirei uma foto dele aberto e outra com a embalagem pronta pra presente. Assim, quem via já conseguia escolher o que queria encomendar.', 'embalagem'],
    ['Pra preparar, eu acompanhei uma receita de um material digital com mais de cem opções de panetones e chocotones caseiros.', 'pdf'],
    ['Tem os ingredientes, as quantidades e o passo a passo visual em PDF pra você seguir na cozinha.', 'pdf'],
    ['Além das receitas, o material também traz guia de embalagem, cardápio pra WhatsApp e mensagens pra receber encomendas.', 'pdf'],
    ['Você tem a receita pra fazer e os materiais pra começar a oferecer.', 'apresentadora'],
    ['Depois daquele pagamento, meu marido começou a perguntar quais sabores eu ia preparar na próxima fornada.', 'apresentadora'],
    ['E eu fiquei com aquela satisfação de ver uma coisa feita pelas minhas mãos se transformar em dinheiro.', 'produto'],
  ].map(([texto, cena]) => ({ texto, cena }));

  const take = (id, titulo, tags, av, obs) => ({ id, titulo, tags, av: av || '', obs: obs || 'Ficha de exemplo do HK-001. Vincule o vídeo real.', blob: null, thumb: null, dur: 0, ini: 0, prompt: '' });

  const ad = (id, o) => Object.assign({
    id, hook: 'H-' + id.slice(3), body: 'BD-001', cta: 'CTA-01', takes: [], mp: 'MP01', ang: 'ANG01', fmt: 'FMT01', av: 'AV01', varCode: 'hkc',
    status: 'gravar', gasto: null, imp: null, hookRate: null, hookEst: false, ic: null, vendas: null, ctr: null, metaId: '', subiuEm: '', obs: '',
  }, o, { nome: NOMES[id] || '' });

  const NOMES = {"HK-001": "pan-mp01-ang01-fmt01-ctl-001", "HK-002": "pan-mp02-ang02-fmt01-ctl-002", "HK-003": "pan-mp01-ang01-fmt02-hkv-003", "HK-004": "pan-mp01-ang01-fmt02-hkv-004", "HK-005": "pan-mp01-ang01-fmt03-hkv-005", "HK-006": "pan-mp01-ang01-fmt03-hkv-006", "HK-007": "pan-mp01-ang01-fmt01-hkc-007", "HK-008": "pan-mp01-ang01-fmt01-hkc-008", "HK-009": "pan-mp01-ang01-fmt01-hkc-009", "HK-010": "pan-mp01-ang01-fmt01-hkv-010", "HK-011": "pan-mp01-ang01-fmt01-hkv-011", "HK-012": "pan-mp01-ang01-fmt01-hkv-012", "HK-013": "pan-mp01-ang01-fmt01-avt-013", "HK-014": "pan-mp01-ang01-fmt04-fmt-014", "HK-015": "pan-mp01-ang01-fmt05-fmt-015", "HK-016": "pan-mp01-ang01-fmt06-fmt-016"};

  const takesHK001 = ['T-001', 'T-006', 'T-007', 'T-008', 'T-009', 'T-010', 'T-005', 'T-011'];

  return {
    id: 'p-panetone',
    nome: 'Panetone caseiro',
    prefixo: 'pan',
    produto: 'panetone',
    produtos: 'panetones',
    ticket: 37.90,
    cpaIdeal: 28,
    criadoEm: '2026-10-26',
    mps: [
      { id: 'MP01', nome: 'Mulher casada que quer provar pro marido (e pra família) que é capaz' },
      { id: 'MP02', nome: 'Mulher que quer ganhar mais sem sair de casa' },
      { id: 'MP03', nome: 'Quem quer economizar no Natal' },
      { id: 'MP04', nome: 'Mãe que quer bancar o Natal dos filhos sozinha' },
    ],
    angs: [
      { id: 'ANG01', nome: 'Quem duvidou de mim' },
      { id: 'ANG02', nome: 'Ganhar mais em casa' },
      { id: 'ANG03', nome: 'Economia: pare de pagar caro no de marca' },
    ],
    avatares: [
      { id: 'AV01', nome: 'Apresentadora de blusa vinho', ficha: 'Brazilian woman in her late 30s, dark hair tied back, wine-colored blouse and light beige apron, warm friendly expression, natural makeup' },
      { id: 'AV02', nome: 'Avental vermelho de bolinhas', ficha: 'Brazilian woman in her 30s, white t-shirt and red polka-dot apron, shoulder-length brown hair, cheerful' },
      { id: 'AV03', nome: 'Selfie na cozinha (camiseta coral)', ficha: 'Brazilian woman in her early 40s, coral t-shirt and beige apron, holding the phone at arm\'s length (selfie), bright kitchen' },
      { id: 'AV04', nome: 'Selfie na sala com árvore de Natal', ficha: 'Brazilian woman in her 40s, casual home clothes, selfie in a cozy living room with sofa, floor lamp and a Christmas tree' },
      { id: 'AV05', nome: 'Espectadora (conta a história de outra)', ficha: 'Brazilian woman in her 50s, gossip tone, leaning toward the camera, kitchen in the background' },
    ],
    hooks: [
      { id: 'H-001', texto: 'Meu marido duvidava que eu fosse ganhar dinheiro vendendo panetone caseiro. Até ver um pagamento de seiscentos e quarenta e sete reais cair na minha conta.', banner: 'Meu marido duvidava... até ver R$647 na conta', quem: 'meu marido', tipo: 'Controle' },
      { id: 'H-002', texto: '', banner: '', quem: '', tipo: 'Controle (ganhar mais em casa)', obs: 'Fala ainda não colada no banco.' },
      { id: 'H-003', texto: 'Meu marido duvidava das minhas vendas de panetone, até ele ver o Pix de seiscentos e quarenta e sete reais que caiu na minha conta.', banner: '', quem: 'meu marido', tipo: 'Hook visual + copy (seguro)' },
      { id: 'H-004', texto: 'Meu marido achava que esses panetones só iam dar trabalho. Até ver o Pix de seiscentos e quarenta e sete reais cair na minha conta.', banner: '', quem: 'meu marido', tipo: 'Hook visual + copy (seguro)' },
      { id: 'H-005', texto: 'Meu marido duvidava que alguém fosse comprar meus panetones. Até eu mostrar o Pix de seiscentos e quarenta e sete reais.', banner: '', quem: 'meu marido', tipo: 'Hook visual + copy (arriscado)' },
      { id: 'H-006', texto: 'Meu marido achava que ninguém ia comprar meus panetones. Até eu mostrar o Pix de seiscentos e quarenta e sete reais de uma encomenda.', banner: '', quem: 'meu marido', tipo: 'Hook visual + copy (arriscado)' },
      { id: 'H-007', texto: 'Minha sogra jurou que panetone feito em casa nunca fica fofinho.', banner: '', quem: 'minha sogra', tipo: 'Quem duvidou (sogra)' },
      { id: 'H-008', texto: 'Minha filha riu quando eu falei que ia fazer panetone pra vender.', banner: '', quem: 'minha filha', tipo: 'Quem duvidou (filha)' },
      { id: 'H-009', texto: 'Meu marido achou que eu tava arrumando mais um jeito de gastar dinheiro.', banner: '', quem: 'meu marido', tipo: 'Frase do body vira abertura' },
      { id: 'H-013', texto: 'O marido da minha vizinha riu dela. Agora é ele que embala os panetones.', banner: '', quem: 'o marido da minha vizinha', tipo: 'Avatar espectador (3ª pessoa)' },
      { id: 'H-014', texto: 'Amor, isso não vai dar certo.', banner: 'amor, isso não vai dar certo', quem: 'meu marido', tipo: 'Print de WhatsApp' },
      { id: 'H-015', texto: 'Sabe a Cida? O marido dela dizia que panetone de casa não vendia...', banner: '', quem: 'o marido da Cida', tipo: 'Fofoca (duas mulheres)' },
      { id: 'H-016', texto: 'POV: o mesmo marido que duvidou agora pergunta quantos faltam pra entregar.', banner: 'POV: o mesmo marido que duvidou...', quem: 'meu marido', tipo: 'POV' },
    ],
    bodies: [
      { id: 'BD-001', nome: 'Marido confere o pagamento → receita → material → CTA', blocos: BODY_001, obs: 'Body validado. Não mexer: as variações trocam só o começo.' },
      { id: 'BD-002', nome: 'Ganhar mais em casa', blocos: [], obs: 'Roteiro ainda não colado no banco.' },
      { id: 'BD-003', nome: 'Mesma fala do BD-001, apresentadora de avental vermelho', blocos: BODY_001, obs: 'Criado sem querer junto com H-003 a H-006: se mudar o resultado, a causa pode ser o hook ou a apresentadora.' },
    ],
    ctas: [
      { id: 'CTA-01', texto: 'Quer aprender a fazer seus panetones pra vender também? Toque em Saiba Mais e baixe as receitas.', tela: 'Toque em Saiba Mais' },
      { id: 'CTA-02', texto: 'Se você também quer provar que consegue, toque em Saiba Mais e pegue as receitas.', tela: 'Toque em Saiba Mais', obs: 'Nova, sem teste.' },
    ],
    takes: [
      take('T-001', 'Close do panetone inteiro na forma de papel, duas mãos sobre bancada preta, azulejo claro', ['hook', 'produto']),
      take('T-002', 'Casal à mesa, ela mostra o celular pra ele, panetones e caneca na mesa', ['hook', 'casal', 'celular'], 'AV02', 'Ficha de exemplo do H-003.'),
      take('T-003', 'Selfie na cozinha clara, braço estendido, camiseta coral', ['hook', 'apresentadora'], 'AV03', 'Ficha de exemplo do H-005.'),
      take('T-004', 'Selfie na sala com árvore de Natal e panetones embalados', ['hook', 'apresentadora'], 'AV04', 'Ficha de exemplo do H-006.'),
      take('T-005', 'Apresentadora de blusa vinho mostrando o material', ['apresentadora'], 'AV01'),
      take('T-006', 'Celular na mão com o pagamento na tela', ['celular']),
      take('T-007', 'Ingredientes espalhados na bancada', ['ingredientes', 'preparo']),
      take('T-008', 'Chocotone de brigadeiro aberto, recheio cremoso escorrendo', ['recheio', 'produto']),
      take('T-009', 'Panetone embalado pra presente, laço vermelho', ['embalagem']),
      take('T-010', 'Páginas do PDF de receitas passando na tela', ['pdf']),
      take('T-011', 'Panetone fatiado com seta verde apontando pra baixo', ['cta', 'produto']),
    ],
    ads: [
      ad('HK-001', { varCode: 'ctl', takes: takesHK001, status: 'validado', gasto: 172.90, imp: 4795, hookRate: 26, hookEst: true, ic: 32, vendas: 5, ctr: 3.19, metaId: '52636295117086', subiuEm: '2026-10-26', obs: 'Vencedor. Hook rate é o ponto fraco; body e CTR seguram. Campanha pausada 30/10.' }),
      ad('HK-002', { hook: 'H-002', body: 'BD-002', mp: 'MP02', ang: 'ANG02', varCode: 'ctl', status: 'pausado', gasto: 104.14, imp: 3845, hookRate: 32, hookEst: true, ic: 10, vendas: 2, ctr: 2.11, metaId: '52636304511486', subiuEm: '2026-10-26', obs: 'Vende, mas CPA acima do ticket. Não descartar o ângulo.' }),
      ad('HK-003', { body: 'BD-003', fmt: 'FMT02', av: 'AV02', varCode: 'hkv', takes: ['T-002'], status: 'teste', subiuEm: '2026-10-29' }),
      ad('HK-004', { body: 'BD-003', fmt: 'FMT02', av: 'AV02', varCode: 'hkv', takes: ['T-002'], status: 'teste', subiuEm: '2026-10-29' }),
      ad('HK-005', { body: 'BD-003', fmt: 'FMT03', av: 'AV03', varCode: 'hkv', takes: ['T-003'], status: 'teste', subiuEm: '2026-10-29' }),
      ad('HK-006', { body: 'BD-003', fmt: 'FMT03', av: 'AV04', varCode: 'hkv', takes: ['T-004'], status: 'teste', subiuEm: '2026-10-29' }),
      ad('HK-007', { takes: ['T-001'] }),
      ad('HK-008', { takes: ['T-001'] }),
      ad('HK-009', { takes: ['T-001'] }),
      ad('HK-013', { av: 'AV05', varCode: 'avt' }),
      ad('HK-014', { fmt: 'FMT04', varCode: 'fmt' }),
      ad('HK-015', { fmt: 'FMT05', av: 'AV05', varCode: 'fmt' }),
      ad('HK-016', { fmt: 'FMT06', varCode: 'fmt' }),
    ],
    montagens: [],
    pedidos: [],
  };
})();
