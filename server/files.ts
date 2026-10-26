// Arquivos pagos ficam em armazenamento PRIVADO, nunca em public/ nem no git.
//   local : pasta FILES_DIR (fora de public), para desenvolvimento
//   blob  : Vercel Blob privado (BLOB_READ_WRITE_TOKEN, ou OIDC na Vercel)
// A escolha é por FILES_BACKEND=local|blob; se vazio, usa local quando FILES_DIR existe e blob quando há token.

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { ConfigError, env } from './env.js'

export interface FileStream {
  stream: ReadableStream<Uint8Array>
  size: number | null
}

export const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function backend(): 'local' | 'blob' {
  const b = env('FILES_BACKEND')
  if (b === 'local' || b === 'blob') return b
  if (env('FILES_DIR')) return 'local'
  if (env('BLOB_READ_WRITE_TOKEN') || env('BLOB_STORE_ID')) return 'blob'
  throw new ConfigError('Arquivos não configurados: defina FILES_DIR (local) ou BLOB_READ_WRITE_TOKEN (Vercel Blob privado).')
}

// storageKey vem sempre do catálogo (findFile), nunca direto do usuário; mesmo assim bloqueia caminhos
export async function openStored(storageKey: string): Promise<FileStream | null> {
  if (storageKey !== basename(storageKey) || storageKey.startsWith('.')) return null
  if (backend() === 'local') {
    const full = resolve(join(env('FILES_DIR'), storageKey))
    try {
      const st = await stat(full)
      return { stream: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>, size: st.size }
    } catch {
      return null
    }
  }
  const { get } = await import('@vercel/blob')
  const r = await get(storageKey, { access: 'private' })
  if (!r || r.statusCode !== 200) return null
  return { stream: r.stream, size: r.blob.size }
}
