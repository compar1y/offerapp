// Envio do código de acesso por e-mail via Resend (API REST). Sem RESEND_API_KEY:
//   desenvolvimento : imprime o código no terminal (só se DEV_LOG_CODES=1)
//   produção        : falha com erro de configuração (nunca finge que enviou)

import { ConfigError, env, isProd } from './env.js'

export async function sendLoginCode(email: string, code: string): Promise<void> {
  const key = env('RESEND_API_KEY')
  const from = env('MAIL_FROM')
  if (!key || !from) {
    if (!isProd() && env('DEV_LOG_CODES') === '1') {
      console.log(`[dev] código de acesso para ${email}: ${code}`)
      return
    }
    throw new ConfigError('E-mail não configurado: defina RESEND_API_KEY e MAIL_FROM.')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Seu código de acesso à Fábrica de Panetones Caseiros',
      text: `Seu código de acesso é ${code}.\n\nEle vale por 10 minutos. Se você não pediu, é só ignorar este e-mail.`,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}`)
}
