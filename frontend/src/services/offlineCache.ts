import { openDB } from 'idb';
import type { DBSchema } from 'idb';

export interface PostDraft {
    $id: string;
    content: string;
    $createdAt: string;
    userId: string;
    authorName: string;
}

export interface CachedPost {
    $id: string;
    content: string;
    userId: string;
    authorName: string;
    $createdAt: string;
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

const dbPromise = openDB<LocalDB>('saltedhash-local', 1, {
    upgrade(db) {
        db.createObjectStore('drafts', { keyPath: '$id' });
        db.createObjectStore('cachedPosts', { keyPath: '$id' });
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
        await Promise.all([
            ...posts.map((post) => tx.store.put(post)),
            tx.done,
        ]);
    },

    async getCachedPosts(): Promise<CachedPost[]> {
        const db = await dbPromise;
        return db.getAll('cachedPosts');
    },
};
