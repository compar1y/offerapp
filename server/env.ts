// Variáveis de ambiente (só os nomes ficam no código; os valores ficam na Vercel).
export const env = (nome: string): string => (process.env[nome] ?? '').trim()

export class ConfigFaltando extends Error {
  constructor(public nome: string) {
    super(`Variável ${nome} não configurada`)
  }
}

export function exigir(nome: string): string {
  const v = env(nome)
  if (!v) throw new ConfigFaltando(nome)
  return v
}
