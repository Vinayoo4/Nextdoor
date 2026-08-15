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
  expires_at: Date | null
}

export interface CreateMessageInput {
  id?: string
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type?: 'text' | 'paste'
  paste_id?: string
  expires_at?: Date | null
}

export class MessageRepository extends BaseRepository {
  private table = 'messages'
  private static inMemoryMessages: Message[] = []

  private pruneExpired(): void {
    const nowTime = new Date().getTime()
    MessageRepository.inMemoryMessages = MessageRepository.inMemoryMessages.filter(
      (m) => !m.expires_at || new Date(m.expires_at).getTime() > nowTime
    )
  }

  findById(id: string): Message | null {
    this.pruneExpired()
    const row = this.executeQueryOne<Message>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByChannelId(channelId: string, options: QueryOptions = {}): PaginatedResult<Message> {
    this.pruneExpired()
    const where = 'WHERE channel_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [channelId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [channelId])
    const items = this.executeQuery<Message>(query, params).map((r) => this.deserializeDates(r))
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
    this.pruneExpired()
    const row = this.executeQueryOne<Message>(`SELECT * FROM ${this.table} WHERE paste_id = ? AND deleted_at IS NULL`, [pasteId])
    return row ? this.deserializeDates(row) : null
  }

  findByUserId(userId: string, options: QueryOptions = {}): PaginatedResult<Message> {
    const where = 'WHERE user_id = ? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > ?)'
    const params = [userId, now()]
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    const items = this.executeQuery<Message>(query, queryParams).map((r) => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  getUserMessageCount(userId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE user_id = ? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`,
      [userId, now()]
    )
    return row?.count || 0
  }

  create(input: CreateMessageInput): Message {
    this.pruneExpired()
    const id = input.id || generateId()
    const timestamp = now()

    this.executeRun(
      `INSERT INTO ${this.table} (id, channel_id, user_id, author_name, content, type, paste_id, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.channel_id, input.user_id, input.author_name, input.content, input.type || 'text',
       input.paste_id || null, timestamp, timestamp, input.expires_at ? new Date(input.expires_at).toISOString() : null]
    )

    const message: Message = {
      id,
      channel_id: input.channel_id,
      user_id: input.user_id,
      author_name: input.author_name,
      content: input.content,
      type: input.type || 'text',
      paste_id: input.paste_id || null,
      created_at: new Date(timestamp),
      updated_at: new Date(timestamp),
      deleted_at: null,
      expires_at: input.expires_at || null,
    }

    MessageRepository.inMemoryMessages.push(message)
    return message
  }

  softDelete(id: string): boolean {
    const result = this.executeRun(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [now(), now(), id]
    )
    const msg = MessageRepository.inMemoryMessages.find((m) => m.id === id)
    if (msg) {
      msg.deleted_at = new Date()
      msg.updated_at = new Date()
    }
    return result.changes > 0 || !!msg
  }

  getChannelMessageCount(channelId: string): number {
    this.pruneExpired()
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE channel_id = ? AND deleted_at IS NULL`,
      [channelId]
    )
    return row?.count || 0
  }
}

export const messageRepository = new MessageRepository()