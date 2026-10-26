// GET /api/dl/<storageKey>?e=<exp>&d=<0|1>&u=<uid>&s=<assinatura>  ->  entrega o arquivo (stream), sem cache.
// A assinatura vem de /api/file/<key> e expira em minutos. Sem assinatura válida: 403.
import { findFile } from '../../shared/catalog.js'
import { verifyFileUrl } from '../../server/crypto.js'
import { MIME, openStored } from '../../server/files.js'
import { fail, json } from '../../server/http.js'

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const key = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    const signed = verifyFileUrl(key, url.searchParams)
    if (!signed) return json({ error: 'Link vencido ou inválido. Abra o material de novo pelo app.' }, 403)
    const hit = findFile(key)
    if (!hit) return json({ error: 'Arquivo não encontrado.' }, 404)
    const file = await openStored(hit.file.storageKey)
    if (!file) return json({ error: 'Arquivo ainda não disponível.' }, 404)
    const name = `${hit.file.id}.${hit.file.kind}`
    const headers: Record<string, string> = {
      'content-type': MIME[hit.file.kind] ?? 'application/octet-stream',
      'content-disposition': `${signed.dl ? 'attachment' : 'inline'}; filename="${name}"`,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
    }
    if (file.size != null) headers['content-length'] = String(file.size)
    return new Response(file.stream, { status: 200, headers })
  } catch (e) {
    return fail(e)
  }
}
