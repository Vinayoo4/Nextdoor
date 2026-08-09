import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const backendDir = path.join(root, 'backend')

const children = []

function isMongoUp() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: 27017, host: '127.0.0.1' })
    socket.setTimeout(1500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

function spawnWithLog(command, opts, name) {
  const child = spawn(command, { stdio: 'inherit', shell: true, ...opts })
  children.push(child)
  child.on('exit', (code) => {
    if (code && code !== 0 && name === 'dev') {
      process.exit(code)
    }
  })
  return child
}

async function main() {
  console.log('[e2e-server] cleaning up stale dev processes…')
  killPort(4000)
  killPort(5173)
  killPort(27017)

  console.log('[e2e-server] preparing backend (mongo + seed)…')

  const mongoUp = await isMongoUp()
  if (!mongoUp) {
    console.log('[e2e-server] starting in-memory MongoDB (dev-mongo)…')
    spawnWithLog('npx tsx scripts/dev-mongo.mjs', { cwd: backendDir }, 'mongo')
    await new Promise((r) => setTimeout(r, 5000))
  }

  const seed = spawnSync('npm run seed -w backend', { cwd: root, stdio: 'inherit', shell: true })
  if (seed.status !== 0) {
    console.error('[e2e-server] seed failed')
    process.exit(1)
  }

  console.log('[e2e-server] starting dev servers…')
  spawnWithLog('npm run dev', { cwd: root }, 'dev')

  await waitForReadiness()

  process.on('SIGINT', () => {
    for (const c of children) c.kill()
    process.exit(0)
  })
}

function checkReady(port, path) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForReadiness() {
  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    const [api, web] = await Promise.all([checkReady(4000), checkReady(5173)])
    if (api && web) {
      console.log('[e2e-server] API and web ready.')
      return
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('[e2e-server] timed out waiting for API (4000) and web (5173)')
}

function killPort(port) {
  try {
    const out = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `$c = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq ${port} }; $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { shell: true, stdio: 'ignore', timeout: 10000 },
    )
    if (out.error) console.log(`[e2e-server] note: could not clean port ${port}`)
  } catch {
    /* non-fatal */
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
