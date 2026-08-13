import { BaseRepository, generateId, now } from './base'

export interface WaitlistRecord {
  id: string
  email: string
  phone: string | null
  city: string | null
  position: number | null
  created_at: Date
}

export class WaitlistRepository extends BaseRepository {
  private table = 'waitlist'

  findByEmail(email: string): WaitlistRecord | null {
    const row = this.executeQueryOne<WaitlistRecord>(
      `SELECT * FROM ${this.table} WHERE email = ?`,
      [email.toLowerCase()]
    )
    return row ? this.deserializeDates(row) : null
  }

  create(email: string): WaitlistRecord {
    const id = generateId()
    const timestamp = now()
    
    // Count current waitlist count to set position
    const countRow = this.executeQueryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${this.table}`)
    const position = (countRow?.count || 0) + 1

    this.executeRun(
      `INSERT INTO ${this.table} (id, email, position, created_at)
       VALUES (?, ?, ?, ?)`,
      [id, email.toLowerCase(), position, timestamp]
    )

    return this.findByEmail(email)!
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }
}

export const waitlistRepository = new WaitlistRepository()
