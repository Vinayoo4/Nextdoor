import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { env } from './env'

let memoryServer: MongoMemoryServer | null = null

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 })
    console.log('[db] connected to MongoDB')
  } catch (err) {
    if (env.nodeEnv !== 'production') {
      console.warn(`[db] could not reach ${env.mongoUri}: ${(err as Error).message}`)
      console.warn('[db] falling back to in-memory MongoDB for local development...')
      memoryServer = await MongoMemoryServer.create()
      const uri = memoryServer.getUri()
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
      console.log('[db] connected to in-memory MongoDB')
      return
    }
    throw err
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
  console.log('[db] disconnected')
}
