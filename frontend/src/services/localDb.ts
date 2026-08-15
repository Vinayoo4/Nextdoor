import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'nextdoor-local'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('posts')) {
          db.createObjectStore('posts', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' })
          store.createIndex('channelId', 'channel_id')
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('unlocked_circles')) {
          db.createObjectStore('unlocked_circles')
        }
        if (!db.objectStoreNames.contains('unlocked_channels')) {
          db.createObjectStore('unlocked_channels')
        }
      },
    })
  }
  return dbPromise
}

export const localDb = {
  // Posts
  async getPosts(): Promise<any[]> {
    const db = await getDB()
    const posts = await db.getAll('posts')
    return posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async savePost(post: any): Promise<void> {
    const db = await getDB()
    await db.put('posts', post)
  },

  async savePosts(posts: any[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('posts', 'readwrite')
    for (const post of posts) {
      if (post) await tx.store.put(post)
    }
    await tx.done
  },

  // Messages
  async getMessages(channelId: string): Promise<any[]> {
    const db = await getDB()
    const tx = db.transaction('messages', 'readonly')
    const index = tx.store.index('channelId')
    const messages = await index.getAll(channelId)
    return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },

  async saveMessage(message: any): Promise<void> {
    const db = await getDB()
    await db.put('messages', message)
  },

  async saveMessages(messages: any[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('messages', 'readwrite')
    for (const msg of messages) {
      if (msg) await tx.store.put(msg)
    }
    await tx.done
  },

  async getAllMessages(): Promise<any[]> {
    const db = await getDB()
    return db.getAll('messages')
  },

  // Personal Notes
  async getNotes(): Promise<any[]> {
    const db = await getDB()
    const notes = await db.getAll('notes')
    return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async saveNote(note: any): Promise<void> {
    const db = await getDB()
    await db.put('notes', note)
  },

  async deleteNote(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('notes', id)
  },

  async deletePost(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('posts', id)
  },

  async deleteMessage(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('messages', id)
  },

  // Locked/Unlocked Checks (Stored locally)
  async isCircleUnlocked(circleId: string): Promise<boolean> {
    const db = await getDB()
    const res = await db.get('unlocked_circles', circleId)
    return !!res
  },

  async unlockCircle(circleId: string): Promise<void> {
    const db = await getDB()
    await db.put('unlocked_circles', true, circleId)
  },

  async isChannelUnlocked(channelId: string): Promise<boolean> {
    const db = await getDB()
    const res = await db.get('unlocked_channels', channelId)
    return !!res
  },

  async unlockChannel(channelId: string): Promise<void> {
    const db = await getDB()
    await db.put('unlocked_channels', true, channelId)
  },

  // Export activities to JSON
  async exportActivities(): Promise<string> {
    const db = await getDB()
    const posts = await db.getAll('posts')
    const messages = await db.getAll('messages')
    const notes = await db.getAll('notes')

    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        posts,
        messages,
        notes
      }
    }

    return JSON.stringify(payload, null, 2)
  },

  // Import activities from JSON
  async importActivities(jsonString: string): Promise<void> {
    const payload = JSON.parse(jsonString)
    if (!payload.data) throw new Error('Invalid activities payload')

    const db = await getDB()
    const { posts = [], messages = [], notes = [] } = payload.data

    const txPosts = db.transaction('posts', 'readwrite')
    for (const post of posts) {
      if (post && post.id) await txPosts.store.put(post)
    }
    await txPosts.done

    const txMessages = db.transaction('messages', 'readwrite')
    for (const msg of messages) {
      if (msg && msg.id) await txMessages.store.put(msg)
    }
    await txMessages.done

    const txNotes = db.transaction('notes', 'readwrite')
    for (const note of notes) {
      if (note && note.id) await txNotes.store.put(note)
    }
    await txNotes.done
  }
}
