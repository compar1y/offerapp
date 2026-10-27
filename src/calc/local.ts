// Conta da Fornada: guarda no aparelho (IndexedDB; se o navegador não deixar, localStorage). Uma entrada por e-mail.
import { docVazio, validarDoc, type CalcDoc } from '../../shared/calc-sync'

export interface Meta {
  /** a cliente apagou a cópia da conta e pediu para não sincronizar de novo */
  syncOff: boolean
  lastSyncAt: string | null
}
export interface Saved {
  doc: CalcDoc
  meta: Meta
}

const DB = 'conta-da-fornada'
const STORE = 'docs'
const LS = (email: string) => `conta-da-fornada:v1:${email.toLowerCase()}`
export const META_PADRAO: Meta = { syncOff: false, lastSyncAt: null }

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<{ ok: boolean; value?: T }> {
  const db = await openDb()
  if (!db) return { ok: false }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => {
        db.close()
        resolve({ ok: true, value: req.result })
      }
      tx.onerror = () => {
        db.close()
        resolve({ ok: false })
      }
      tx.onabort = () => {
        db.close()
        resolve({ ok: false })
      }
    } catch {
      resolve({ ok: false })
    }
  })
}

function parse(raw: unknown): Saved | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { doc?: unknown; meta?: Partial<Meta> }
  const v = validarDoc(r.doc)
  if (!v.ok) return null
  return { doc: v.doc, meta: { syncOff: !!r.meta?.syncOff, lastSyncAt: typeof r.meta?.lastSyncAt === 'string' ? r.meta.lastSyncAt : null } }
}

export async function loadLocal(email: string): Promise<Saved> {
  const key = email.toLowerCase()
  const a = await idb<unknown>('readonly', (s) => s.get(key))
  const fromIdb = a.ok ? parse(a.value) : null
  if (fromIdb) return fromIdb
  try {
    const raw = localStorage.getItem(LS(email))
    const fromLs = raw ? parse(JSON.parse(raw)) : null
    if (fromLs) return fromLs
  } catch {
    /* começa vazio */
  }
  return { doc: docVazio(new Date().toISOString()), meta: { ...META_PADRAO } }
}

export async function saveLocal(email: string, saved: Saved): Promise<boolean> {
  const key = email.toLowerCase()
  const r = await idb('readwrite', (s) => s.put(saved, key))
  if (r.ok) {
    try {
      localStorage.removeItem(LS(email))
    } catch {
      /* nada */
    }
    return true
  }
  try {
    localStorage.setItem(LS(email), JSON.stringify(saved))
    return true
  } catch {
    return false
  }
}

export async function eraseLocal(email: string): Promise<void> {
  await idb('readwrite', (s) => s.delete(email.toLowerCase()))
  try {
    localStorage.removeItem(LS(email))
  } catch {
    /* nada */
  }
}
