import { BaseRepository, generateId, now } from './base'

export class UserSavedPlacesRepository extends BaseRepository {
  private table = 'user_saved_places'

  isSaved(userId: string, businessId: string): boolean {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE user_id = ? AND business_id = ?`,
      [userId, businessId]
    )
    return (row?.count || 0) > 0
  }

  save(userId: string, businessId: string): void {
    const id = generateId()
    this.executeRun(
      `INSERT OR IGNORE INTO ${this.table} (id, user_id, business_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, userId, businessId, now()]
    )
  }

  unsave(userId: string, businessId: string): boolean {
    const result = this.executeRun(
      `DELETE FROM ${this.table} WHERE user_id = ? AND business_id = ?`,
      [userId, businessId]
    )
    return result.changes > 0
  }

  getSavedBusinesses(userId: string): string[] {
    const rows = this.executeQuery<{ business_id: string }>(
      `SELECT business_id FROM ${this.table} WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map(r => r.business_id)
  }
}

export const userSavedPlacesRepository = new UserSavedPlacesRepository()
