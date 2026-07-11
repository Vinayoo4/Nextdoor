import { Client, Account, Databases, Storage, ID, Query } from 'appwrite'

const client = new Client()

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69c3aeb5001e29bce67a'

client.setEndpoint(endpoint).setProject(projectId)

export { client }
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

export { ID, Query }

export const APPWRITE_CONFIG = {
  endpoint,
  projectId,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID as string,
  collections: {
    posts: import.meta.env.VITE_APPWRITE_POSTS_COLLECTION_ID as string,
    comments: import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION_ID as string,
    businesses: import.meta.env.VITE_APPWRITE_BUSINESSES_COLLECTION_ID as string,
    circles: import.meta.env.VITE_APPWRITE_CIRCLES_COLLECTION_ID as string,
    channels: import.meta.env.VITE_APPWRITE_CHANNELS_COLLECTION_ID as string,
    messages: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID as string,
  },
  bucketId: import.meta.env.VITE_APPWRITE_BUCKET_ID as string,
}

export function getFilePreviewUrl(fileId: string): string {
  return `${endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${fileId}/preview?project=${projectId}`
}