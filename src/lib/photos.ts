// Fotos do Livro de Fornadas: ficam SÓ no aparelho (IndexedDB). Nunca são enviadas a lugar nenhum.
import { useEffect, useState } from 'react'

const DB = 'panetone-fotos'
const STORE = 'fotos'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const r = f(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(r.result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
export const putPhoto = (id: string, blob: Blob): Promise<IDBValidKey> => run('readwrite', (s) => s.put(blob, id))
export const getPhoto = (id: string): Promise<Blob | undefined> => run('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)
export const delPhoto = (id: string): Promise<undefined> => run('readwrite', (s) => s.delete(id) as IDBRequest<undefined>)

export async function delPhotos(ids: string[]): Promise<void> {
  try {
    for (const id of ids) await delPhoto(id)
  } catch {
    /* sem IndexedDB: nada a apagar */
  }
}

// reduz a foto (lado maior 1024 px, JPEG) para não encher o aparelho
export async function resizeImage(file: File, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', 0.8))
}

export function usePhotoUrl(id: string, has: boolean | undefined, rev = 0): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let u: string | null = null
    if (!has) {
      setUrl(null)
      return
    }
    getPhoto(id)
      .then((b) => {
        if (!alive || !b) return
        u = URL.createObjectURL(b)
        setUrl(u)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id, has, rev])
  return url
}
