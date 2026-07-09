require('dotenv').config();
const { Client, Databases, Storage, ID } = require('node-appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID;

const COLLECTIONS = {
  posts: { id: null, attributes: [
    { key: 'content', type: 'string', size: 500, required: true },
    { key: 'userId', type: 'string', size: 36, required: true },
    { key: 'authorName', type: 'string', size: 128, required: true },
    { key: 'imageId', type: 'string', size: 36, required: false },
  ], indexes: [
    { key: 'created_desc', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
  ]},
  comments: { id: null, attributes: [
    { key: 'content', type: 'string', size: 500, required: true },
    { key: 'postId', type: 'string', size: 36, required: true },
    { key: 'userId', type: 'string', size: 36, required: true },
    { key: 'authorName', type: 'string', size: 128, required: true },
  ], indexes: [
    { key: 'post_idx', type: 'key', attributes: ['postId'], orders: ['ASC'] },
  ]},
  businesses: { id: null, attributes: [
    { key: 'name', type: 'string', size: 128, required: true },
    { key: 'category', type: 'string', size: 64, required: true },
    { key: 'shortDescription', type: 'string', size: 256, required: true },
    { key: 'description', type: 'string', size: 2000, required: false },
    { key: 'phone', type: 'string', size: 32, required: false },
    { key: 'email', type: 'string', size: 128, required: false },
    { key: 'imageId', type: 'string', size: 36, required: false },
  ], indexes: [
    { key: 'created_desc', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
  ]},
  circles: { id: null, attributes: [
    { key: 'name', type: 'string', size: 128, required: true },
    { key: 'description', type: 'string', size: 512, required: true },
  ], indexes: []},
  channels: { id: null, attributes: [
    { key: 'name', type: 'string', size: 128, required: true },
    { key: 'circleId', type: 'string', size: 36, required: true },
  ], indexes: [
    { key: 'circle_idx', type: 'key', attributes: ['circleId'], orders: ['ASC'] },
  ]},
  messages: { id: null, attributes: [
    { key: 'content', type: 'string', size: 1000, required: true },
    { key: 'channelId', type: 'string', size: 36, required: true },
    { key: 'userId', type: 'string', size: 36, required: true },
    { key: 'authorName', type: 'string', size: 128, required: true },
  ], indexes: [
    { key: 'channel_idx', type: 'key', attributes: ['channelId'], orders: ['ASC'] },
  ]},
};

async function setupAppwrite() {
  if (!process.env.APPWRITE_API_KEY || !process.env.APPWRITE_PROJECT_ID) {
    console.error('Missing APPWRITE_API_KEY or APPWRITE_PROJECT_ID env var');
    process.exit(1);
  }
  if (!DB_ID) {
    console.error('Missing APPWRITE_DATABASE_ID env var');
    process.exit(1);
  }

  console.log('Starting Appwrite setup...\n');

  for (const [name, config] of Object.entries(COLLECTIONS)) {
    console.log(`Creating collection: ${name}`);
    try {
      const collection = await databases.createCollection(
        DB_ID,
        ID.unique(),
        name,
        [
          `read("users")`,
          `create("users")`,
          `update("user:__USER_ID__")`,
          `delete("user:__USER_ID__")`,
        ],
        true // document security enabled
      );
      config.id = collection.$id;
      console.log(`  Collection ID: ${collection.$id}`);

      for (const attr of config.attributes) {
        try {
          await databases.createStringAttribute(
            DB_ID, collection.$id, attr.key, attr.size, attr.required
          );
          console.log(`  Attribute: ${attr.key} (string, ${attr.size})`);
        } catch (e) {
          console.log(`  Attribute ${attr.key} already exists or error:`, e.message);
        }
      }

      for (const idx of config.indexes) {
        try {
          await databases.createIndex(
            DB_ID, collection.$id, idx.key, idx.type, idx.attributes, idx.orders
          );
          console.log(`  Index: ${idx.key}`);
        } catch (e) {
          console.log(`  Index ${idx.key} already exists or error:`, e.message);
        }
      }
    } catch (e) {
      console.log(`  Collection ${name} already exists or error:`, e.message);
    }
    console.log('');
  }

  // Create storage bucket
  console.log('Creating storage bucket: saltedhash-media');
  try {
    const bucket = await storage.createBucket(
      ID.unique(),
      'saltedhash-media',
      [
        `read("users")`,
        `create("users")`,
        `update("user:__USER_ID__")`,
        `delete("user:__USER_ID__")`,
      ],
      true,
      5 * 1024 * 1024, // 5 MB
      ['jpg', 'jpeg', 'png', 'gif', 'webp']
    );
    console.log(`  Bucket ID: ${bucket.$id}`);
  } catch (e) {
    console.log('  Bucket already exists or error:', e.message);
  }

  console.log('\nSetup complete!');
  console.log('Collection IDs:');
  for (const [name, config] of Object.entries(COLLECTIONS)) {
    console.log(`  ${name}: ${config.id || '(check console for ID)'}`);
  }
}

setupAppwrite().catch(console.error);
