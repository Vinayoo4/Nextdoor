import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'nextdoor-cache'
const STORE = 'kv'
const MAX_ENTRIES = 200

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB()
    return (await db.get(STORE, key)) as T | undefined
  } catch {
    return undefined
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB()
    await db.put(STORE, value, key)
    const count = await db.count(STORE)
    if (count > MAX_ENTRIES) {
      const tx = db.transaction(STORE, 'readwrite')
      let cursor = await tx.store.openCursor()
      let removed = 0
      while (cursor && removed < count - MAX_ENTRIES) {
        await cursor.delete()
        removed++
        cursor = await cursor.continue()
      }
    }
  } catch {
    // cache failures are non-fatal
  }
}

export function cacheKey(method: string, url: string, body?: unknown): string {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`
}

export async function isOnline(): Promise<boolean> {
  if (navigator.onLine !== undefined) return navigator.onLine
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}
