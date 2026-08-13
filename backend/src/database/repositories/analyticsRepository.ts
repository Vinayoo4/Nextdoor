import { BaseRepository, generateId, now } from './base'

export type AnalyticsType = 'impression' | 'click' | 'call' | 'navigate' | 'save' | 'report'

export interface AnalyticsEvent {
  id: string
  type: AnalyticsType
  listing_id: string | null
  user_id: string | null
  meta: Record<string, unknown>
  created_at: Date
}

export interface CreateAnalyticsInput {
  type: AnalyticsType
  listing_id?: string
  user_id?: string
  meta?: Record<string, unknown>
}

export class AnalyticsRepository extends BaseRepository {
  private table = 'analytics_events'

  findById(id: string): AnalyticsEvent | null {
    const row = this.executeQueryOne<AnalyticsEvent>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeAnalytics(row) : null
  }

  create(input: CreateAnalyticsInput): AnalyticsEvent {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, type, listing_id, user_id, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id, input.type, input.listing_id || null, input.user_id || null,
        JSON.stringify(input.meta || {}), timestamp
      ]
    )
    
    return this.findById(id)!
  }

  getStatsForBusiness(listingId: string): Record<string, number> {
    const rows = this.executeQuery<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count FROM ${this.table} WHERE listing_id = ? GROUP BY type`,
      [listingId]
    )
    
    const stats: Record<string, number> = {
      impression: 0,
      click: 0,
      call: 0,
      navigate: 0,
      save: 0,
      report: 0
    }
    
    for (const r of rows) {
      if (r.type in stats) {
        stats[r.type] = r.count
      }
    }
    
    return stats
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }

  private deserializeAnalytics(row: AnalyticsEvent): AnalyticsEvent {
    const deserialized = this.deserializeDates(row)
    return {
      ...deserialized,
      meta: this.parseJsonField(deserialized.meta, {})
    }
  }
}

export const analyticsRepository = new AnalyticsRepository()
