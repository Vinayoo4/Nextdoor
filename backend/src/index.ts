import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { connectDB } from './config/db'
import { env } from './config/env'
import routes from './routes'
import { errorHandler, notFoundHandler } from './utils/errors'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigin, credentials: false }))
app.use(express.json({ limit: '2mb' }))
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api', routes)
app.use(notFoundHandler)
app.use(errorHandler)

if (env.nodeEnv === 'production') {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/^\/(?!api|health).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
}

async function main() {
  try {
    await connectDB()
    app.listen(env.port, () => {
      console.log(`[server] API ready at http://localhost:${env.port}`)
    })
  } catch (err) {
    console.error('[server] failed to start:', err)
    process.exit(1)
  }
}

main()
