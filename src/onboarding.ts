// Onboarding obrigatório SEM perguntas e SEM escolher confeiteira (Levi, 10/11): boas-vindas → nome → Início.
// Quem ainda não tem perfil no app (o nome) passa por ele antes do Início; quem já tem entra direto.
// A confeiteira (avatar) não é mais escolhida: o app grava o padrão AVATAR_PADRAO junto com o nome.
// As 5 perguntas (Pergunta/Resultado) ficam no código, mas fora deste caminho. Sem perfil das perguntas, o app usa o padrão ('iniciante').
import type { Eu } from './api'
import type { Tela } from './ctx'

/** as telas do onboarding, na ordem */
export const PASSOS_ONBOARDING = ['boas', 'nome'] as const

/** confeiteira padrão (AVATARES[0] em shared/conteudo.ts), gravada no fim do onboarding */
export const AVATAR_PADRAO = 0

/** telas em que nada "do app" aparece por cima ou embaixo: popup de desconto, aviso de instalar e barra do rodapé */
export const TELAS_ONBOARDING = new Set<Tela['t']>([...PASSOS_ONBOARDING, 'pergunta', 'resultado'])

export const emOnboarding = (t: Tela) => TELAS_ONBOARDING.has(t.t)

/** ela já montou o perfil no app? (já disse o nome, ou respondeu as perguntas antigas) */
export const temPerfil = (eu: Pick<Eu, 'apelido' | 'perfil'>) => !!eu.perfil || !!(eu.apelido ?? '').trim()

/** primeira tela ao abrir o app: o onboarding para quem não tem perfil, senão o Início.
 *  `salva` é a tela guardada no histórico da aba (recarregar continua onde estava), mas sem pular o onboarding. */
export function telaInicial(eu: Pick<Eu, 'apelido' | 'perfil'>, salva?: Tela | null): Tela {
  if (!temPerfil(eu)) return salva && PASSOS_ONBOARDING.includes(salva.t as (typeof PASSOS_ONBOARDING)[number]) ? salva : { t: 'boas' }
  if (salva?.t && !emOnboarding(salva)) return salva
  return { t: 'painel' }
}
