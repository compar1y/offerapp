// Aulas em vídeo: a lista (módulos e aulas) é dado puro, compartilhado com os testes. O endereço dos vídeos fica em src/data/aulas.ts.
// Títulos em português simples, sem termo em inglês e sem nome de canal, marca ou perfil. O campo `arquivo` é o nome exato do .mp4.

export interface Aula {
  arquivo: string
  titulo: string
  // o que a cliente vai ver, em uma linha
  sub: string
  // duração em segundos (medida no arquivo)
  dur: number
}

export interface Modulo {
  id: string
  titulo: string
  lead: string
  aulas: Aula[]
}

export const MODULOS: Modulo[] = [
  {
    id: 'tradicional',
    titulo: 'Panetone tradicional',
    lead: 'Do jeito clássico: massa, frutas, formas e forno.',
    aulas: [
      { arquivo: '06-PizzaPaoePasta.mp4', titulo: 'Panetone caseiro fácil, começando pela esponja', sub: 'Uma visão rápida da receita feita com esponja.', dur: 12 },
      { arquivo: '07-PizzaPaoePasta.mp4', titulo: 'Panetone fofinho: massa, modelagem e forno', sub: 'Do preparo da massa até sair do forno.', dur: 32 },
      { arquivo: '16-paesdojoao9725.mp4', titulo: 'Da massa às formas: como modelar e assar', sub: 'Mostra como colocar a massa nas formas.', dur: 38 },
      { arquivo: '09-testereceitas.mp4', titulo: 'Panetone caseiro do começo ao forno', sub: 'O preparo da massa até assar.', dur: 60 },
      { arquivo: '12-testereceitas.mp4', titulo: 'Panetone com frutas, passo a passo', sub: 'Massa, frutas e forno.', dur: 60 },
      { arquivo: '19-Celiane.mp4', titulo: 'Panetone com frutas: massa, formas e forno', sub: 'Mais um passo a passo completo.', dur: 61 },
      { arquivo: '46-DicaseReceitasNoemiDuarte.mp4', titulo: 'Como sovar, colocar as frutas e modelar', sub: 'Sova, frutas, modelagem e forno.', dur: 50 },
      { arquivo: '33-cameelam.mp4', titulo: 'Panetone clássico de Natal, receita de família', sub: 'Uma receita tradicional de família.', dur: 56 },
      { arquivo: '21-bonasseoficial.mp4', titulo: 'Panetone tradicional completo', sub: 'A aula mais longa, com a receita inteira.', dur: 106 },
      { arquivo: '22-bonasseoficial.mp4', titulo: 'Panetone natural, outra receita completa', sub: 'Outra versão do panetone, do começo ao fim.', dur: 99 },
    ],
  },
  {
    id: 'chocotone',
    titulo: 'Chocotone',
    lead: 'Massa com gotas e bastante chocolate.',
    aulas: [
      { arquivo: '27-AchadONsecreto.mp4', titulo: 'Panetone com gotas de chocolate em casa', sub: 'As formas e as gotas, bem rapidinho.', dur: 13 },
      { arquivo: '28-Receitasnaotaobemdescritas-Gla.mp4', titulo: 'Chocotone caseiro: massa, gotas e forno', sub: 'Do preparo até assar.', dur: 46 },
      { arquivo: '48-NathyeEltonof.mp4', titulo: 'Chocotone caseiro: das gotas às formas', sub: 'Massa, gotas, formas e forno.', dur: 60 },
      { arquivo: '17-porflaviamartins.mp4', titulo: 'Chocotone com bastante chocolate', sub: 'Para quem gosta de muito chocolate.', dur: 52 },
      { arquivo: '50-cantinhogourmetdalu7639.mp4', titulo: 'Mini chocotone de liquidificador', sub: 'Versão pequena, feita no liquidificador.', dur: 60 },
      { arquivo: '13-LeodeniceCamargo.mp4', titulo: 'Chocotone italiano passo a passo', sub: 'Da massa ao forno.', dur: 60 },
      { arquivo: '08-TamiresMota.mp4', titulo: 'Panetone e chocotone: sova, recheio e forno (segunda parte)', sub: 'Este vídeo já começa na sova.', dur: 60 },
      { arquivo: '49-Elianekovalsk.mp4', titulo: 'Panetone e chocotone com as medidas na tela', sub: 'As quantidades aparecem escritas no vídeo.', dur: 59 },
    ],
  },
  {
    id: 'recheios',
    titulo: 'Recheios e versões especiais',
    lead: 'Quanto rechear e versões para quem tem restrição.',
    aulas: [
      { arquivo: '14-receitasdepeso.mp4', titulo: 'Panetone com esponja e a conta do recheio', sub: 'Dica: o recheio é 25% do peso.', dur: 21 },
      { arquivo: '23-sabaru_cs.mp4', titulo: 'Panetone recheado: massa, recheio e acabamento', sub: 'Como rechear e finalizar.', dur: 30 },
      { arquivo: '15-minharotinasemgluten.mp4', titulo: 'Chocotone sem glúten e ideias de recheio', sub: 'Versão sem glúten e outras opções de recheio.', dur: 42 },
      { arquivo: '42-receitas3s480.mp4', titulo: 'Panetone sem leite e sem ovo, rápido e na tigela', sub: 'Versão vegana, sem batedeira.', dur: 58 },
    ],
  },
  {
    id: 'salgado',
    titulo: 'Panetone salgado',
    lead: 'Para o lanche e para a ceia.',
    aulas: [
      { arquivo: '45-LarissaSuellenn.mp4', titulo: 'Panetone salgado fácil, de massa líquida', sub: 'Recheio e massa líquida.', dur: 53 },
      { arquivo: '34-CanalRodrigoZilio.mp4', titulo: 'Panetone salgado no liquidificador', sub: 'Massa mole batida no liquidificador.', dur: 60 },
      { arquivo: '35-Comerebomdemais.mp4', titulo: 'Panetone salgado recheado', sub: 'Massa e recheio salgado.', dur: 59 },
    ],
  },
]

// ordem única (módulo por módulo) para "próxima" e "anterior"
export const AULAS: (Aula & { modulo: Modulo })[] = MODULOS.flatMap((m) => m.aulas.map((a) => ({ ...a, modulo: m })))
export const AULA_BY_FILE: Record<string, (typeof AULAS)[number]> = Object.fromEntries(AULAS.map((a) => [a.arquivo, a]))
export const ehAula = (x: string): boolean => Object.prototype.hasOwnProperty.call(AULA_BY_FILE, x)

export const durLabel = (s: number): string => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min${s % 60 >= 5 ? ` ${Math.round(s % 60)} s` : ''}`)
