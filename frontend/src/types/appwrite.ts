import type { Models } from 'appwrite'

export interface Post extends Models.Document {
  content: string
  userId: string
  authorName: string
  imageId?: string
}

export interface Comment extends Models.Document {
  content: string
  postId: string
  userId: string
  authorName: string
}

export interface Business extends Models.Document {
  name: string
  category: string
  shortDescription: string
  description?: string
  phone?: string
  email?: string
  imageId?: string
}

export interface Circle extends Models.Document {
  name: string
  description: string
}

export interface Channel extends Models.Document {
  name: string
  circleId: string
}

export interface Message extends Models.Document {
  content: string
  channelId: string
  userId: string
  authorName: string
}

export type SyncStatus = 'pending' | 'syncing' | 'failed'

export interface PostDraft {
  $id: string
  content: string
  $createdAt: string
  userId: string
  authorName: string
  imageId?: string
  syncStatus: SyncStatus
}

export interface CachedPost {
  $id: string
  content: string
  userId: string
  authorName: string
  $createdAt: string
  imageId?: string
}
