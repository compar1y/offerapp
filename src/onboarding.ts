// Onboarding obrigatório SEM perguntas (Levi, 10/11): boas-vindas → nome → avatar → Início.
// Quem ainda não tem perfil no app (nome + confeiteira) passa por ele antes do Início; quem já tem entra direto.
// As 5 perguntas (Pergunta/Resultado) ficam no código, mas fora deste caminho. Sem perfil das perguntas, o app usa o padrão ('iniciante').
import type { Eu } from './api'
import type { Tela } from './ctx'

/** as telas do onboarding, na ordem */
export const PASSOS_ONBOARDING = ['boas', 'nome', 'avatar'] as const

/** telas em que nada "do app" aparece por cima ou embaixo: popup de desconto, aviso de instalar e barra do rodapé */
export const TELAS_ONBOARDING = new Set<Tela['t']>([...PASSOS_ONBOARDING, 'pergunta', 'resultado'])

export const emOnboarding = (t: Tela) => TELAS_ONBOARDING.has(t.t)

/** ela já montou o perfil no app? (nome e confeiteira escolhidos, ou respondeu as perguntas antigas) */
export const temPerfil = (eu: Pick<Eu, 'apelido' | 'avatar' | 'perfil'>) => !!eu.perfil || (!!(eu.apelido ?? '').trim() && eu.avatar != null)

/** primeira tela ao abrir o app: o onboarding para quem não tem perfil, senão o Início.
 *  `salva` é a tela guardada no histórico da aba (recarregar continua onde estava), mas sem pular o onboarding. */
export function telaInicial(eu: Pick<Eu, 'apelido' | 'avatar' | 'perfil'>, salva?: Tela | null): Tela {
  if (!temPerfil(eu)) return salva && PASSOS_ONBOARDING.includes(salva.t as (typeof PASSOS_ONBOARDING)[number]) ? salva : { t: 'boas' }
  if (salva?.t && !emOnboarding(salva)) return salva
  return { t: 'painel' }
}
