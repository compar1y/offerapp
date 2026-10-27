// Servidor local que roda as funções de api/ (mesmos handlers da Vercel), só para desenvolvimento e QA. Não é usado em produção.
//   cp .env.example .env.local   (preencha os segredos)   e depois:   npm run dev:api
//   (em outro terminal)  npm run dev:server     (o Vite encaminha /api para a porta 8787)
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, relative } from 'node:path'
import { Readable } from 'node:stream'

// carrega .env.local / .env sem sobrescrever o que já está no ambiente (nenhum valor é impresso)
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
}

type Handler = (r: Request) => Promise<Response> | Response
interface Route {
  re: RegExp
  mod: Record<string, Handler>
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]))
}

const routes: Route[] = []
for (const file of walk('api')) {
  const rel = relative('api', file).replace(/\.ts$/, '').split('\\').join('/')
  const pattern = rel.replace(/\[[^\]]+\]/g, '[^/]+')
  routes.push({ re: new RegExp(`^/api/${pattern}/?$`), mod: (await import(join(process.cwd(), file))) as Record<string, Handler> })
}

const port = Number(process.env.API_PORT) || 8787
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const route = routes.find((r) => r.re.test(url.pathname))
  const handler = route?.mod[req.method ?? 'GET']
  if (!route || !handler) {
    res.writeHead(route ? 405 : 404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'rota não encontrada' }))
    return
  }
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  const out = await handler(new Request(url, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body }))
  const outHeaders: Record<string, string> = {}
  out.headers.forEach((v, k) => {
    outHeaders[k] = v
  })
  res.writeHead(out.status, outHeaders)
  if (out.body) Readable.fromWeb(out.body as import('node:stream/web').ReadableStream).pipe(res)
  else res.end()
}).listen(port, () => console.log(`API local em http://localhost:${port}/api (${routes.length} rotas)`))
