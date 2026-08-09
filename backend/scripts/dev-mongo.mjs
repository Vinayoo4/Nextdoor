import { MongoMemoryServer } from 'mongodb-memory-server'

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, bindIp: '127.0.0.1', dbName: 'nextdoor' },
  binary: { version: '8.2.6' },
})

console.log(`[dev-mongo] ready at mongodb://127.0.0.1:27017/nextdoor`)
console.log(`[dev-mongo] run 'npm run seed' then 'npm run dev' in another terminal. Press Ctrl+C to stop.`)

const shutdown = async () => {
  await mongod.stop()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

setInterval(() => {}, 1 << 30)
