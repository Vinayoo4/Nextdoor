import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { PostDraft, CachedPost } from '../types/appwrite'

<<<<<<< Updated upstream
export interface PostDraft {
    $id: string;
    content: string;
    $createdAt: string;
    userId: string;
    authorName: string;
    syncStatus: 'pending' | 'syncing' | 'failed';
}

export interface CachedPost {
    $id: string;
    content: string;
    userId: string;
    authorName: string;
    $createdAt: string;
    // adding missing fields so it fits PostModel footprint
    $collectionId?: string;
    $databaseId?: string;
    $updatedAt?: string;
    $permissions?: string[];
}
=======
const MAX_CACHED_POSTS = 100
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
const dbPromise = openDB<LocalDB>('saltedhash-local', 2, {
    upgrade(db, oldVersion, _newVersion) {
        if (oldVersion < 1) {
            db.createObjectStore('drafts', { keyPath: '$id' });
            db.createObjectStore('cachedPosts', { keyPath: '$id' });
        }
        if (oldVersion < 2) {
            // Note: Since syncStatus is new, you might normally migrate old records here if the app is live.
        }
    },
});
=======
const dbPromise = openDB<LocalDB>('saltedhash-local', 1, {
  upgrade(db) {
    db.createObjectStore('drafts', { keyPath: '$id' })
    db.createObjectStore('cachedPosts', { keyPath: '$id' })
  },
})
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
    async cachePosts(posts: CachedPost[]) {
        const db = await dbPromise;
        const tx = db.transaction('cachedPosts', 'readwrite');
        const store = tx.objectStore('cachedPosts');

        await Promise.all(posts.map((post) => store.put(post)));

        const count = await store.count();
        if (count > 100) {
            let cursor = await store.openCursor();
            let toDelete = count - 100;
            while (cursor && toDelete > 0) {
                await cursor.delete();
                cursor = await cursor.continue();
                toDelete--;
            }
        }

        await tx.done;
    },
=======
  async removeDraft(id: string) {
    const db = await dbPromise
    await db.delete('drafts', id)
  },
>>>>>>> Stashed changes

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
