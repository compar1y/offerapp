// Relógio do servidor no aparelho: o prazo do desconto é decidido no servidor; aqui só contamos o tempo,
// corrigindo a diferença entre o relógio do celular e o do servidor (que vem em /api/eu, acesso.agora).
let diferenca = 0
export function ajustarRelogio(iso: string | null | undefined): void {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isNaN(t)) diferenca = t - Date.now()
}
/** agora, no relógio do servidor */
export const agoraServidor = (): number => Date.now() + diferenca
