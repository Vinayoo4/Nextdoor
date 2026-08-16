import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import fs from 'node:fs'
import pinoHttp from 'pino-http'
import { randomUUID } from 'node:crypto'
import { runMigrations, getDatabase } from './database/connection'
import { env } from './config/env'
import routes from './routes'
import { errorHandler, notFoundHandler } from './utils/errors'
import { verifyToken } from './utils/jwt'

const app = express()

// Structured logging with pino-http
const logger = pinoHttp({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  autoLogging: {
    ignore: (req) => req.url === '/api/health'
  }
})

app.use(logger)
app.use(helmet())
app.use(cors({ origin: env.corsOrigin, credentials: false }))
app.use(express.json({ limit: '2mb' }))

// Request ID middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || randomUUID()
  ;(req as any).id = reqId
  res.setHeader('x-request-id', reqId)
  next()
})

// API Request/Response audit logs middleware
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    if (
      req.url === '/api/health' ||
      req.url === '/health' ||
      req.url.startsWith('/api/admin/audit-logs') ||
      req.url.endsWith('.js') ||
      req.url.endsWith('.css') ||
      req.url.endsWith('.png') ||
      req.url.endsWith('.ico')
    ) {
      return
    }

    try {
      const responseTime = Date.now() - start
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
      
      let userId = ''
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1]
          if (token) {
            const decoded = verifyToken(token)
            userId = decoded.userId
          }
        } catch {}
      }

      const db = getDatabase()
      const isPg = require('./database/connection').isPg
      const id = randomUUID()

      const headersJson = JSON.stringify(req.headers)
      const queryJson = JSON.stringify(req.query)

      db.prepare(`
        INSERT INTO api_audit_logs (id, method, url, status_code, response_time, ip, user_id, headers, query, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${isPg ? 'CURRENT_TIMESTAMP' : "datetime('now')"})
      `).run(id, req.method, req.originalUrl || req.url, res.statusCode, responseTime, ip, userId, headersJson, queryJson)

      db.prepare(`
        DELETE FROM api_audit_logs 
        WHERE id NOT IN (
          SELECT id FROM api_audit_logs 
          ORDER BY created_at DESC 
          LIMIT 500
        )
      `).run()
    } catch (e) {
      console.error('Failed to log API audit record:', e)
    }
  })

  next()
})

// Global Rate Limiter
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Strict Rate Limiter for Authentication and Mutation requests
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // Max 30 writes/mutations per minute per IP
  message: { error: 'Too many mutation requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.path !== '/health') {
    return writeLimiter(req, res, next)
  }
  next()
})

app.get('/api/health', (_req, res) => {
  try {
    const db = getDatabase()
    db.prepare('SELECT 1').get()
    return res.json({ ok: true, database: 'connected' })
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message })
  }
})
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

function main() {
  try {
    runMigrations()
    console.log('[db] SQLite database initialized and migrated')
    app.listen(env.port, () => {
      console.log(`[server] API ready at http://localhost:${env.port}`)
    })
  } catch (err) {
    console.error('[server] failed to start:', err)
    process.exit(1)
  }
}

if (env.nodeEnv !== 'production' || process.env.VERCEL !== '1') {
  main()
} else {
  try {
    runMigrations()
  } catch (err) {
    console.error('[db] SQLite migration error on serverless:', err)
  }
}

export default app
