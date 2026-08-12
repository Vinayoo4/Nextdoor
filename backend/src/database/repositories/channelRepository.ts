import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Channel {
  id: string
  name: string
  circle_id: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateChannelInput {
  name: string
  circle_id: string
}

export class ChannelRepository extends BaseRepository {
  private table = 'channels'

  findById(id: string): Channel | null {
    const row = this.executeQueryOne<Channel>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByCircleId(circleId: string, options: QueryOptions = {}): PaginatedResult<Channel> {
    const where = 'WHERE circle_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [circleId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [circleId])
    
    const items = this.executeQuery<Channel>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateChannelInput): Channel {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, name, circle_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.name, input.circle_id, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, name: string): Channel | null {
    const existing = this.findById(id)
    if (!existing) return null

    this.executeRun(
      `UPDATE ${this.table} SET name = ?, updated_at = ? WHERE id = ?`,
      [name, now(), id]
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
}

export const channelRepository = new ChannelRepository()