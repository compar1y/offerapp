// Troca as páginas no armazenamento passando pelo próprio app (só precisa do ADMIN_TOKEN, não da chave do Supabase).
// Uso: APP_URL=https://offerapp-umber.vercel.app ADMIN_TOKEN=... node scripts/subir-paginas-admin.mjs /mnt/project-files/app-novo/paginas-hd
// Pode rodar de novo: substitui o que já existe.
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const pasta = process.argv[2] ?? '/mnt/project-files/app-novo/paginas-hd'
const app = (process.env.APP_URL ?? 'https://offerapp-umber.vercel.app').replace(/\/$/, '')
const token = process.env.ADMIN_TOKEN
if (!token) {
  console.error('Falta ADMIN_TOKEN no ambiente.')
  process.exit(1)
}

let total = 0
let falhas = 0
for (const m of (await readdir(pasta, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const arquivos = (await readdir(join(pasta, m))).filter((f) => /^\d{3}\.webp$/.test(f)).sort()
  for (const f of arquivos) {
    const p = Number(f.slice(0, 3))
    for (let tentativa = 1; ; tentativa++) {
      const r = await fetch(`${app}/api/admin?m=${encodeURIComponent(m)}&p=${p}`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'image/webp' },
        body: await readFile(join(pasta, m, f)),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
      if (r.ok) { total++; break }
      if (tentativa >= 3) { falhas++; console.error(`${m}/${f}: ${r.status} ${await r.text()}`); break }
      await new Promise((ok) => setTimeout(ok, 1000 * tentativa))
    }
  }
  console.log(`${m}: ${arquivos.length} páginas`)
}
console.log(`Pronto: ${total} enviadas, ${falhas} com erro.`)
if (falhas) process.exit(1)
