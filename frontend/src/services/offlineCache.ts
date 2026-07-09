import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { PostDraft, CachedPost } from '../types/appwrite'

const MAX_CACHED_POSTS = 100

interface LocalDB extends DBSchema {
  drafts: {
    key: string
    value: PostDraft
  }
  cachedPosts: {
    key: string
    value: CachedPost
  }
}

const dbPromise = openDB<LocalDB>('saltedhash-local', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('drafts', { keyPath: '$id' })
      db.createObjectStore('cachedPosts', { keyPath: '$id' })
    }
    if (oldVersion < 2) {
      // syncStatus migration is handled by getDrafts default
    }
  },
})

export const offlineCache = {
  async saveDraft(draft: PostDraft) {
    const db = await dbPromise
    await db.put('drafts', draft)
  },

  async updateDraftStatus(id: string, syncStatus: PostDraft['syncStatus']) {
    const db = await dbPromise
    const draft = await db.get('drafts', id)
    if (draft) {
      await db.put('drafts', { ...draft, syncStatus })
    }
  },

  async getDrafts(): Promise<PostDraft[]> {
    const db = await dbPromise
    const drafts = await db.getAll('drafts')
    return drafts.map((d) => ({
      ...d,
      syncStatus: d.syncStatus ?? 'pending',
    }))
  },

  async removeDraft(id: string) {
    const db = await dbPromise
    await db.delete('drafts', id)
  },

  async cachePosts(posts: CachedPost[]) {
    const db = await dbPromise
    const existing = await db.getAll('cachedPosts')
    const merged = new Map<string, CachedPost>()

    for (const post of existing) {
      merged.set(post.$id, post)
    }
    for (const post of posts) {
      merged.set(post.$id, post)
    }

    const sorted = [...merged.values()].sort(
      (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    )
    const capped = sorted.slice(0, MAX_CACHED_POSTS)

    const tx = db.transaction('cachedPosts', 'readwrite')
    await tx.store.clear()
    await Promise.all([...capped.map((post) => tx.store.put(post)), tx.done])
  },

  async getCachedPosts(): Promise<CachedPost[]> {
    const db = await dbPromise
    const posts = await db.getAll('cachedPosts')
    return posts.sort(
      (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    )
  },
}
