import { BaseRepository, generateId, now } from './base'

export interface Offer {
  id: string
  business_id: string
  title: string
  discount: string
  code: string | null
  valid_from: Date
  valid_to: Date
  status: 'active' | 'expired' | 'disabled'
  created_at: Date
  updated_at: Date
}

export interface CreateOfferInput {
  business_id: string
  title: string
  discount: string
  code?: string
  valid_from: Date
  valid_to: Date
  status?: 'active' | 'expired' | 'disabled'
}

export class OfferRepository extends BaseRepository {
  private table = 'offers'

  findById(id: string): Offer | null {
    const row = this.executeQueryOne<Offer>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByBusinessId(businessId: string): Offer[] {
    const rows = this.executeQuery<Offer>(
      `SELECT * FROM ${this.table}
       WHERE business_id = ? AND status = 'active' AND datetime(valid_to) >= datetime('now')
       ORDER BY valid_to ASC`,
      [businessId]
    )
    return rows.map(r => this.deserializeDates(r))
  }

  create(input: CreateOfferInput): Offer {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, business_id, title, discount, code, valid_from, valid_to, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.business_id, input.title, input.discount, input.code || null,
        input.valid_from.toISOString(), input.valid_to.toISOString(), input.status || 'active',
        timestamp, timestamp
      ]
    )
    
    return this.findById(id)!
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }
}

export const offerRepository = new OfferRepository()
