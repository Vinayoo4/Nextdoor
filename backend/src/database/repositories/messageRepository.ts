import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Message {
  id: string
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type: 'text' | 'paste'
  paste_id: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateMessageInput {
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type?: 'text' | 'paste'
  paste_id?: string
}

export class MessageRepository extends BaseRepository {
  private table = 'messages'

  findById(id: string): Message | null {
    const row = this.executeQueryOne<Message>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByChannelId(channelId: string, options: QueryOptions = {}): PaginatedResult<Message> {
    const where = 'WHERE channel_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [channelId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [channelId])
    
    const items = this.executeQuery<Message>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findByPasteId(pasteId: string): Message | null {
    const row = this.executeQueryOne<Message>(
      `SELECT * FROM ${this.table} WHERE paste_id = ? AND deleted_at IS NULL`,
      [pasteId]
    )
    return row ? this.deserializeDates(row) : null
  }

  create(input: CreateMessageInput): Message {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, channel_id, user_id, author_name, content, type, paste_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.channel_id, input.user_id, input.author_name, input.content, 
       input.type || 'text', input.paste_id || null, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  softDelete(id: string): boolean {
    const result = this.executeRun(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now(), now(), id]
    )
    return result.changes > 0
  }

  getChannelMessageCount(channelId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE channel_id = ? AND deleted_at IS NULL`,
      [channelId]
    )
    return row?.count || 0
  }
}

export const messageRepository = new MessageRepository()