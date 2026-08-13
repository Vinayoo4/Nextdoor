import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface PasteComment {
  id: string
  paste_id: string
  user_id: string
  content: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreatePasteCommentInput {
  paste_id: string
  user_id: string
  content: string
}

export class PasteCommentRepository extends BaseRepository {
  private table = 'paste_comments'

  findById(id: string): PasteComment | null {
    const row = this.executeQueryOne<PasteComment>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByPasteId(pasteId: string, options: QueryOptions = {}): PaginatedResult<PasteComment & { user_name: string }> {
    const limit = options.limit || 50
    const offset = options.offset || 0
    const query = `
      SELECT c.*, u.name as user_name FROM ${this.table} c
      JOIN users u ON c.user_id = u.id
      WHERE c.paste_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
    const countQuery = `SELECT COUNT(*) as count FROM ${this.table} WHERE paste_id = ? AND deleted_at IS NULL`
    
    const items = this.executeQuery<PasteComment & { user_name: string }>(query, [pasteId, limit, offset]).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, [pasteId])?.count || 0
    
    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  create(input: CreatePasteCommentInput): PasteComment {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, paste_id, user_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.paste_id, input.user_id, input.content, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, content: string): PasteComment | null {
    const existing = this.findById(id)
    if (!existing) return null

    this.executeRun(
      `UPDATE ${this.table} SET content = ?, updated_at = ? WHERE id = ?`,
      [content, now(), id]
    )
    return this.findById(id)
  }

  softDelete(id: string): boolean {
    const result = this.executeRun(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now(), now(), id]
    )
    return result.changes > 0
  }

  getPasteCommentCount(pasteId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE paste_id = ? AND deleted_at IS NULL`,
      [pasteId]
    )
    return row?.count || 0
  }
}

export const pasteCommentRepository = new PasteCommentRepository()