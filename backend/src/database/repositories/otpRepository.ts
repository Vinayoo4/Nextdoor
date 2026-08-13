import { BaseRepository, generateId, now } from './base'

export interface OtpRecord {
  id: string
  email: string
  code_hash: string
  expires_at: Date
  attempts: number
  created_at: Date
}

export class OtpRepository extends BaseRepository {
  private table = 'otps'

  findByEmail(email: string): OtpRecord | null {
    const row = this.executeQueryOne<OtpRecord>(
      `SELECT * FROM ${this.table} WHERE email = ?`,
      [email.toLowerCase()]
    )
    return row ? this.deserializeDates(row) : null
  }

  create(email: string, codeHash: string, expiresAt: Date): OtpRecord {
    const id = generateId()
    const timestamp = now()
    
    // UPSERT style: delete old OTP record if it exists first
    this.deleteByEmail(email)
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, email, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, email.toLowerCase(), codeHash, expiresAt.toISOString(), timestamp]
    )
    
    return this.findByEmail(email)!
  }

  incrementAttempts(email: string): number {
    const record = this.findByEmail(email)
    if (!record) return 0
    const newAttempts = record.attempts + 1
    this.executeRun(
      `UPDATE ${this.table} SET attempts = ? WHERE email = ?`,
      [newAttempts, email.toLowerCase()]
    )
    return newAttempts
  }

  deleteByEmail(email: string): boolean {
    const result = this.executeRun(
      `DELETE FROM ${this.table} WHERE email = ?`,
      [email.toLowerCase()]
    )
    return result.changes > 0
  }
}

export const otpRepository = new OtpRepository()
