import { BaseRepository, generateId, now } from './base'

export interface Review {
  id: string
  business_id: string
  user_id: string
  rating: number
  text: string
  owner_reply: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateReviewInput {
  business_id: string
  user_id: string
  rating: number
  text: string
}

export class ReviewRepository extends BaseRepository {
  private table = 'reviews'

  findById(id: string): Review | null {
    const row = this.executeQueryOne<Review>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByBusinessId(businessId: string, limit: number = 50): Review[] {
    const rows = this.executeQuery<Review>(
      `SELECT * FROM ${this.table} WHERE business_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`,
      [businessId, limit]
    )
    return rows.map(r => this.deserializeDates(r))
  }

  findByUserAndBusiness(userId: string, businessId: string): Review | null {
    const row = this.executeQueryOne<Review>(
      `SELECT * FROM ${this.table} WHERE user_id = ? AND business_id = ? AND deleted_at IS NULL`,
      [userId, businessId]
    )
    return row ? this.deserializeDates(row) : null
  }

  create(input: CreateReviewInput): Review {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, business_id, user_id, rating, text, owner_reply, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      [id, input.business_id, input.user_id, input.rating, input.text, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }
}

export const reviewRepository = new ReviewRepository()
