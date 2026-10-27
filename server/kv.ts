// Armazenamento: interface mínima de chave-valor, com 2 implementações trocáveis.
//   JsonFileKV : arquivo JSON local (desenvolvimento, `npm run dev:api`). Não serve na Vercel (disco só de leitura).
//   RestKV     : Upstash Redis / Vercel KV pela API REST (KV_REST_API_URL + KV_REST_API_TOKEN). Nenhuma conta é criada pelo código.
// Troca = só variáveis de ambiente (veja README).

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { ConfigError, env } from './env.js'

export interface KV {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlSec?: number): Promise<void>
  del(key: string): Promise<void>
  // soma 1 e devolve o novo valor; a expiração é definida na criação
  incr(key: string, ttlSec?: number): Promise<number>
  // lista com limite (mais recentes no fim)
  push(key: string, value: unknown, max?: number): Promise<void>
  list<T>(key: string, limit?: number): Promise<T[]>
}

interface Row {
  v: unknown
  x?: number
}

export class JsonFileKV implements KV {
  private data: Record<string, Row> | null = null
  private chain: Promise<unknown> = Promise.resolve()
  private file: string
  constructor(file: string) {
    this.file = file
  }

  private async load(): Promise<Record<string, Row>> {
    if (this.data) return this.data
    try {
      this.data = JSON.parse(await readFile(this.file, 'utf8')) as Record<string, Row>
    } catch {
      this.data = {}
    }
    return this.data
  }

  // serializa as operações e grava de forma atômica (arquivo temporário + rename)
  private run<T>(fn: (d: Record<string, Row>) => T | Promise<T>, write: boolean): Promise<T> {
    const p = this.chain.then(async () => {
      const d = await this.load()
      const out = await fn(d)
      if (write) {
        await mkdir(dirname(this.file), { recursive: true })
        const tmp = `${this.file}.tmp`
        await writeFile(tmp, JSON.stringify(d))
        await rename(tmp, this.file)
      }
      return out
    })
    this.chain = p.catch(() => undefined)
    return p
  }

  private live(d: Record<string, Row>, key: string): Row | undefined {
    const r = d[key]
    if (r && r.x && r.x < Date.now()) {
      delete d[key]
      return undefined
    }
    return r
  }

  get<T>(key: string) {
    return this.run((d) => (this.live(d, key)?.v as T | undefined) ?? null, false)
  }
  set(key: string, value: unknown, ttlSec?: number) {
    return this.run((d) => {
      d[key] = { v: value, x: ttlSec ? Date.now() + ttlSec * 1000 : undefined }
    }, true)
  }
  del(key: string) {
    return this.run((d) => {
      delete d[key]
    }, true)
  }
  incr(key: string, ttlSec?: number) {
    return this.run((d) => {
      const cur = this.live(d, key)
      const n = (typeof cur?.v === 'number' ? cur.v : 0) + 1
      d[key] = { v: n, x: cur?.x ?? (ttlSec ? Date.now() + ttlSec * 1000 : undefined) }
      return n
    }, true)
  }
  push(key: string, value: unknown, max = 5000) {
    return this.run((d) => {
      const arr = Array.isArray(this.live(d, key)?.v) ? (d[key].v as unknown[]) : []
      arr.push(value)
      d[key] = { v: arr.slice(-max) }
    }, true)
  }
  list<T>(key: string, limit = 200) {
    return this.run((d) => {
      const v = this.live(d, key)?.v
      return (Array.isArray(v) ? v.slice(-limit) : []) as T[]
    }, false)
  }
}

export class RestKV implements KV {
  private url: string
  private token: string
  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    })
    if (!res.ok) throw new Error(`KV ${res.status}`)
    return ((await res.json()) as { result: T }).result
  }

  async get<T>(key: string) {
    const r = await this.cmd<string | null>('GET', key)
    return r == null ? null : (JSON.parse(r) as T)
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    if (ttlSec) await this.cmd('SET', key, JSON.stringify(value), 'EX', ttlSec)
    else await this.cmd('SET', key, JSON.stringify(value))
  }
  async del(key: string) {
    await this.cmd('DEL', key)
  }
  async incr(key: string, ttlSec?: number) {
    const n = await this.cmd<number>('INCR', key)
    if (n === 1 && ttlSec) await this.cmd('EXPIRE', key, ttlSec)
    return n
  }
  async push(key: string, value: unknown, max = 5000) {
    await this.cmd('RPUSH', key, JSON.stringify(value))
    await this.cmd('LTRIM', key, -max, -1)
  }
  async list<T>(key: string, limit = 200) {
    const r = await this.cmd<string[]>('LRANGE', key, -limit, -1)
    return r.map((x) => JSON.parse(x) as T)
  }
}

let cached: KV | null = null

export function getKV(): KV {
  if (cached) return cached
  const url = env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL')
  const token = env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN')
  if (url && token) cached = new RestKV(url, token)
  else if (env('VERCEL')) throw new ConfigError('Armazenamento não configurado: defina KV_REST_API_URL e KV_REST_API_TOKEN (a Vercel não tem disco gravável).')
  else cached = new JsonFileKV(env('DATA_FILE') || '.data/db.json')
  return cached
}

// só para testes
export function setKV(kv: KV | null) {
  cached = kv
}
