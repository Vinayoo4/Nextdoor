import { openDB } from 'idb';
import type { DBSchema } from 'idb';

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

interface LocalDB extends DBSchema {
    drafts: {
        key: string;
        value: PostDraft;
    };
    cachedPosts: {
        key: string;
        value: CachedPost;
    };
}

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

export const offlineCache = {
    async saveDraft(draft: PostDraft) {
        const db = await dbPromise;
        await db.put('drafts', draft);
    },

    async getDrafts(): Promise<PostDraft[]> {
        const db = await dbPromise;
        return db.getAll('drafts');
    },

    async removeDraft(id: string) {
        const db = await dbPromise;
        await db.delete('drafts', id);
    },

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

    async getCachedPosts(): Promise<CachedPost[]> {
        const db = await dbPromise;
        return db.getAll('cachedPosts');
    },
};
