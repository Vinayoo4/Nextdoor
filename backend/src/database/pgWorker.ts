import { workerData, parentPort } from 'node:worker_threads'
import { Client } from 'pg'

const { connectionString, sab } = workerData
const int32 = new Int32Array(sab)
const uint8 = new Uint8Array(sab)

const client = new Client({ connectionString })

async function run() {
  await client.connect()

  // Tell the parent thread that we are ready
  parentPort?.postMessage({ type: 'ready' })

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  while (true) {
    // Wait until state (int32[0]) becomes 1 (Query requested)
    Atomics.wait(int32, 0, 0)

    if (Atomics.load(int32, 0) !== 1) {
      continue
    }

    // Read input query and parameters
    const length = int32[1]
    const queryDataString = decoder.decode(uint8.subarray(8, 8 + length))
    const { query, params } = JSON.parse(queryDataString)

    // Rewrite query placeholders from ? to $1, $2 for PostgreSQL
    let index = 1
    let pgSql = query.replace(/\?/g, () => `$${index++}`)

    // Map SQLite-specific dialects to PostgreSQL
    pgSql = pgSql
      .replace(/INSERT OR IGNORE INTO user_saved_places/gi, 'INSERT INTO user_saved_places')
      .replace(/INSERT OR IGNORE INTO users/gi, 'INSERT INTO users')
      .replace(/INSERT OR IGNORE INTO emergencies/gi, 'INSERT INTO emergencies')
      .replace(/INSERT OR IGNORE INTO buildings/gi, 'INSERT INTO buildings')
      .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')

    // If we removed OR IGNORE, append ON CONFLICT clause
    if (query.toUpperCase().includes('INSERT OR IGNORE INTO USER_SAVED_PLACES')) {
      pgSql += ' ON CONFLICT (user_id, business_id) DO NOTHING'
    } else if (query.toUpperCase().includes('INSERT OR IGNORE INTO USERS')) {
      pgSql += ' ON CONFLICT (email) DO NOTHING'
    } else if (query.toUpperCase().includes('INSERT OR IGNORE INTO EMERGENCIES')) {
      pgSql += ' ON CONFLICT (id) DO NOTHING'
    } else if (query.toUpperCase().includes('INSERT OR IGNORE INTO BUILDINGS')) {
      pgSql += ' ON CONFLICT (id) DO NOTHING'
    }

    try {
      const res = await client.query(pgSql, params)
      const responseObj = {
        rows: res.rows,
        rowCount: res.rowCount,
        changes: res.rowCount,
      }
      const responseBytes = encoder.encode(JSON.stringify(responseObj))

      // Write results to SharedArrayBuffer
      uint8.set(responseBytes, 8)
      int32[1] = responseBytes.length

      // Set state to 2 (Success) and notify main thread
      Atomics.store(int32, 0, 2)
      Atomics.notify(int32, 0, 1)
    } catch (err: any) {
      const errorBytes = encoder.encode(JSON.stringify({ error: err.message }))

      // Write error to SharedArrayBuffer
      uint8.set(errorBytes, 8)
      int32[1] = errorBytes.length

      // Set state to 3 (Error) and notify main thread
      Atomics.store(int32, 0, 3)
      Atomics.notify(int32, 0, 1)
    }
  }
}

run().catch((err) => {
  console.error('[pgWorker] Fatal crash:', err)
  process.exit(1)
})
