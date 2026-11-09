// Aulas em vídeo: a lista (módulos e aulas) é dado puro, compartilhado com o app, o servidor e os testes.
// Títulos em português simples, sem termo em inglês e sem nome de canal, marca ou perfil.
// `arquivo` é o nome do .mp4 em public/aulas/ (aula-01 … aula-25, na ordem da lista). Quem abre /aulas/* passa pelo middleware.ts,
// que confere a sessão e a compra. `ref` é o número do arquivo antigo (06-…mp4), só para migrar o progresso de quem já assistiu.

export interface Aula {
  arquivo: string
  ref: string
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
      { arquivo: 'aula-01.mp4', ref: '06', titulo: 'Panetone caseiro fácil, começando pela esponja', sub: 'Uma visão rápida da receita feita com esponja.', dur: 12 },
      { arquivo: 'aula-02.mp4', ref: '07', titulo: 'Panetone fofinho: massa, modelagem e forno', sub: 'Do preparo da massa até sair do forno.', dur: 32 },
      { arquivo: 'aula-03.mp4', ref: '16', titulo: 'Da massa às formas: como modelar e assar', sub: 'Mostra como colocar a massa nas formas.', dur: 38 },
      { arquivo: 'aula-04.mp4', ref: '09', titulo: 'Panetone caseiro do começo ao forno', sub: 'O preparo da massa até assar.', dur: 60 },
      { arquivo: 'aula-05.mp4', ref: '12', titulo: 'Panetone com frutas, passo a passo', sub: 'Massa, frutas e forno.', dur: 60 },
      { arquivo: 'aula-06.mp4', ref: '19', titulo: 'Panetone com frutas: massa, formas e forno', sub: 'Mais um passo a passo completo.', dur: 61 },
      { arquivo: 'aula-07.mp4', ref: '46', titulo: 'Como sovar, colocar as frutas e modelar', sub: 'Sova, frutas, modelagem e forno.', dur: 50 },
      { arquivo: 'aula-08.mp4', ref: '33', titulo: 'Panetone clássico de Natal, receita de família', sub: 'Uma receita tradicional de família.', dur: 56 },
      { arquivo: 'aula-09.mp4', ref: '21', titulo: 'Panetone tradicional completo', sub: 'A aula mais longa, com a receita inteira.', dur: 106 },
      { arquivo: 'aula-10.mp4', ref: '22', titulo: 'Panetone natural, outra receita completa', sub: 'Outra versão do panetone, do começo ao fim.', dur: 99 },
    ],
  },
  {
    id: 'chocotone',
    titulo: 'Chocotone',
    lead: 'Massa com gotas e bastante chocolate.',
    aulas: [
      { arquivo: 'aula-11.mp4', ref: '27', titulo: 'Panetone com gotas de chocolate em casa', sub: 'As formas e as gotas, bem rapidinho.', dur: 13 },
      { arquivo: 'aula-12.mp4', ref: '28', titulo: 'Chocotone caseiro: massa, gotas e forno', sub: 'Do preparo até assar.', dur: 46 },
      { arquivo: 'aula-13.mp4', ref: '48', titulo: 'Chocotone caseiro: das gotas às formas', sub: 'Massa, gotas, formas e forno.', dur: 60 },
      { arquivo: 'aula-14.mp4', ref: '17', titulo: 'Chocotone com bastante chocolate', sub: 'Para quem gosta de muito chocolate.', dur: 52 },
      { arquivo: 'aula-15.mp4', ref: '50', titulo: 'Mini chocotone de liquidificador', sub: 'Versão pequena, feita no liquidificador.', dur: 60 },
      { arquivo: 'aula-16.mp4', ref: '13', titulo: 'Chocotone italiano passo a passo', sub: 'Da massa ao forno.', dur: 60 },
      { arquivo: 'aula-17.mp4', ref: '08', titulo: 'Panetone e chocotone: sova, recheio e forno (segunda parte)', sub: 'Este vídeo já começa na sova.', dur: 60 },
      { arquivo: 'aula-18.mp4', ref: '49', titulo: 'Panetone e chocotone com as medidas na tela', sub: 'As quantidades aparecem escritas no vídeo.', dur: 59 },
    ],
  },
  {
    id: 'recheios',
    titulo: 'Recheios e versões especiais',
    lead: 'Quanto rechear e versões para quem tem restrição.',
    aulas: [
      { arquivo: 'aula-19.mp4', ref: '14', titulo: 'Panetone com esponja e a conta do recheio', sub: 'Dica: o recheio é 25% do peso.', dur: 21 },
      { arquivo: 'aula-20.mp4', ref: '23', titulo: 'Panetone recheado: massa, recheio e acabamento', sub: 'Como rechear e finalizar.', dur: 30 },
      { arquivo: 'aula-21.mp4', ref: '15', titulo: 'Chocotone sem glúten e ideias de recheio', sub: 'Versão sem glúten e outras opções de recheio.', dur: 42 },
      { arquivo: 'aula-22.mp4', ref: '42', titulo: 'Panetone sem leite e sem ovo, rápido e na tigela', sub: 'Versão vegana, sem batedeira.', dur: 58 },
    ],
  },
  {
    id: 'salgado',
    titulo: 'Panetone salgado',
    lead: 'Para o lanche e para a ceia.',
    aulas: [
      { arquivo: 'aula-23.mp4', ref: '45', titulo: 'Panetone salgado fácil, de massa líquida', sub: 'Recheio e massa líquida.', dur: 53 },
      { arquivo: 'aula-24.mp4', ref: '34', titulo: 'Panetone salgado no liquidificador', sub: 'Massa mole batida no liquidificador.', dur: 60 },
      { arquivo: 'aula-25.mp4', ref: '35', titulo: 'Panetone salgado recheado', sub: 'Massa e recheio salgado.', dur: 59 },
    ],
  },
]

// ordem única (módulo por módulo) para "próxima" e "anterior"
export const AULAS: (Aula & { modulo: Modulo })[] = MODULOS.flatMap((m) => m.aulas.map((a) => ({ ...a, modulo: m })))
export const AULA_BY_FILE: Record<string, (typeof AULAS)[number]> = Object.fromEntries(AULAS.map((a) => [a.arquivo, a]))
export const ehAula = (x: string): boolean => Object.prototype.hasOwnProperty.call(AULA_BY_FILE, x)

/** nome antigo ("06-qualquercoisa.mp4") → nome novo ("aula-01.mp4"); nomes novos passam direto */
export function aulaAtual(x: string): string | null {
  if (ehAula(x)) return x
  const m = /^(\d{2})-.+\.mp4$/.exec(x)
  return (m && AULAS.find((a) => a.ref === m[1])?.arquivo) || null
}

export const durLabel = (s: number): string => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min${s % 60 >= 5 ? ` ${Math.round(s % 60)} s` : ''}`)
