// GET /api/pagina?m=ebook&p=1 → redireciona para a imagem da página (link temporário do armazenamento privado).
// Só abre se ela comprou o material. O link expira em 1 hora; repassado, para de funcionar.
import { ehMaterial, MATERIAIS } from '../shared/catalogo.js'
import { acessoDe } from '../server/acesso.js'
import { BUCKET, db } from '../server/db.js'
import { falha, json } from '../server/http.js'
import { emailDaSessao } from '../server/sessao.js'
import { prefixoDasPaginas } from '../server/paginas.js'

export async function GET(req: Request): Promise<Response> {
  try {
    const email = emailDaSessao(req)
    if (!email) return json({ erro: 'Entre de novo com o e-mail da compra.' }, 401)
    const url = new URL(req.url)
    const m = url.searchParams.get('m') ?? ''
    const p = Number(url.searchParams.get('p'))
    if (!ehMaterial(m) || !Number.isInteger(p) || p < 1 || p > MATERIAIS[m].paginas) return json({ erro: 'Página não encontrada.' }, 404)
    const acesso = await acessoDe(email)
    if (!acesso.materiais.includes(m)) return json({ erro: 'Este material não está no seu acesso.' }, 403)
    const prefixo = await prefixoDasPaginas()
    if (prefixo === null) {
      console.error('pagina: pasta ebook não encontrada no bucket', BUCKET)
      return json({ erro: 'As páginas ainda não foram enviadas ao armazenamento.' }, 404)
    }
    const caminho = `${prefixo}${m}/${String(p).padStart(3, '0')}.webp`
    const { data, error } = await db().storage.from(BUCKET).createSignedUrl(caminho, 3600)
    if (error || !data) {
      console.error('pagina: sem link para', caminho, error?.message)
      return json({ erro: 'Esta página não foi encontrada no armazenamento.', caminho }, 404)
    }
    return new Response(null, { status: 302, headers: { location: data.signedUrl, 'cache-control': 'private, max-age=3000' } })
  } catch (e) {
    return falha(e)
  }
}
