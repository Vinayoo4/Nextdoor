import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '69c3aeb5001e29bce67a');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

// Validate required env vars at startup
const requiredEnvVars = [
    'VITE_APPWRITE_DATABASE_ID',
    'VITE_APPWRITE_POSTS_COLLECTION_ID',
    'VITE_APPWRITE_COMMENTS_COLLECTION_ID',
    'VITE_APPWRITE_BUSINESSES_COLLECTION_ID',
    'VITE_APPWRITE_CIRCLES_COLLECTION_ID',
    'VITE_APPWRITE_CHANNELS_COLLECTION_ID',
    'VITE_APPWRITE_MESSAGES_COLLECTION_ID',
    'VITE_APPWRITE_BUCKET_ID',
];

requiredEnvVars.forEach((key) => {
    if (!import.meta.env[key]) {
        console.error(`[APPWRITE CONFIG] Missing required environment variable: ${key}`);
    }
});

export const APPWRITE_CONFIG = {
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
};
