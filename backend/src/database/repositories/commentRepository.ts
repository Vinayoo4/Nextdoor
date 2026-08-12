import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Comment {
  id: string
  post_id: string
  user_id: string
  author_name: string
  content: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateCommentInput {
  post_id: string
  user_id: string
  author_name: string
  content: string
}

export class CommentRepository extends BaseRepository {
  private table = 'comments'

  findById(id: string): Comment | null {
    const row = this.executeQueryOne<Comment>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByPostId(postId: string, options: QueryOptions = {}): PaginatedResult<Comment> {
    const where = 'WHERE post_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [postId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [postId])
    
    const items = this.executeQuery<Comment>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateCommentInput): Comment {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, post_id, user_id, author_name, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.post_id, input.user_id, input.author_name, input.content, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, content: string): Comment | null {
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

  getPostCommentCount(postId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE post_id = ? AND deleted_at IS NULL`,
      [postId]
    )
    return row?.count || 0
  }
}

export const commentRepository = new CommentRepository()