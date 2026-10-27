// Variáveis de ambiente. Nenhum segredo fica no código: tudo vem do ambiente (veja .env.example).

export class ConfigError extends Error {}

export function env(name: string): string {
  return (process.env[name] ?? '').trim()
}

export function requireEnv(name: string): string {
  const v = env(name)
  if (!v) throw new ConfigError(`Variável de ambiente ausente: ${name}`)
  return v
}

export const isProd = () => env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production'
