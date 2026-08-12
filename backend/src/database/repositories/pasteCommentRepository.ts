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

  findByPasteId(pasteId: string, options: QueryOptions = {}): PaginatedResult<PasteComment> {
    const where = 'WHERE paste_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [pasteId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [pasteId])
    
    const items = this.executeQuery<PasteComment>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
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