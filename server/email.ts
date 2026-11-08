// E-mail "Seu acesso está liberado", enviado pelo próprio app quando o pagamento cai.
// Usa a API do Resend (https://resend.com) por fetch, sem biblioteca.
// Fica desligado enquanto RESEND_API_KEY e EMAIL_REMETENTE não estiverem configurados na Vercel.
import { PRODUTOS, type ProdutoId } from '../shared/catalogo.js'
import { env } from './env.js'

export const emailLigado = () => !!env('RESEND_API_KEY') && !!env('EMAIL_REMETENTE')
const urlApp = () => env('APP_URL') || 'https://offerapp-umber.vercel.app'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function montarEmailAcesso(email: string, produtos: ProdutoId[]) {
  const url = urlApp()
  const nomes = produtos.map((p) => PRODUTOS[p].nome)
  const assunto = produtos.includes('kit') ? '🎄 Seu acesso à Fábrica de Panetones está liberado' : `🎁 Liberado no seu app: ${nomes.join(' + ')}`
  const lista = nomes.map((n) => `<li style="margin:4px 0">${esc(n)}</li>`).join('')
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FFF8EF;font-family:Arial,Helvetica,sans-serif;color:#2E1E14">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
  <div style="background:#fff;border:2px solid #EEDFCB;border-radius:20px;padding:24px">
    <p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#C9333F">Fábrica de Panetones Caseiros</p>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Seu acesso está liberado! 🎄</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.5">Já está tudo aberto no seu app:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.5">${lista}</ul>
    <a href="${esc(url)}" style="display:block;text-align:center;background:#1F6448;color:#fff;text-decoration:none;font-weight:bold;font-size:18px;padding:14px;border-radius:14px">Entrar no meu app</a>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#76604F">Para entrar, use este e-mail: <b>${esc(email)}</b>. Não precisa de senha.</p>
    <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#76604F">Dica: depois de entrar, toque em "Adicionar à tela inicial" para o app ficar no seu celular como um aplicativo.</p>
  </div>
  <p style="margin:12px 0 0;font-size:12px;color:#76604F;text-align:center">Você recebeu este e-mail porque comprou na Fábrica de Panetones Caseiros.</p>
</div></body></html>`
  const texto = `Seu acesso está liberado!\n\nJá está aberto no seu app: ${nomes.join(', ')}.\n\nEntre em: ${url}\nUse este e-mail para entrar: ${email} (não precisa de senha).`
  return { assunto, html, texto }
}

/** envia; nunca lança erro (o webhook não pode falhar por causa do e-mail). Devolve se foi. */
export async function enviarEmailAcesso(email: string, produtos: ProdutoId[]): Promise<{ enviado: boolean; erro?: string }> {
  if (!emailLigado()) return { enviado: false, erro: 'desligado' }
  const { assunto, html, texto } = montarEmailAcesso(email, produtos)
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env('EMAIL_REMETENTE'), to: [email], subject: assunto, html, text: texto }),
    })
    if (!r.ok) return { enviado: false, erro: `${r.status} ${(await r.text()).slice(0, 200)}` }
    return { enviado: true }
  } catch (e) {
    return { enviado: false, erro: e instanceof Error ? e.message : String(e) }
  }
}
