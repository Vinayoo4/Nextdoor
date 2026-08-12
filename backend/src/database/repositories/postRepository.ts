import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Post {
  id: string
  user_id: string
  author_name: string
  content: string
  image_url: string | null
  location_lat: number | null
  location_lng: number | null
  locality_id: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreatePostInput {
  user_id: string
  author_name: string
  content: string
  image_url?: string
  location_lat?: number
  location_lng?: number
  locality_id?: string
}

export class PostRepository extends BaseRepository {
  private table = 'posts'

  findById(id: string): Post | null {
    const row = this.executeQueryOne<Post>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findAll(options: QueryOptions = {}, filters: { locality_id?: string; user_id?: string } = {}): PaginatedResult<Post> {
    const conditions: string[] = ['deleted_at IS NULL']
    const params: unknown[] = []

    if (filters.locality_id) {
      conditions.push('locality_id = ?')
      params.push(filters.locality_id)
    }
    if (filters.user_id) {
      conditions.push('user_id = ?')
      params.push(filters.user_id)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<Post>(query, queryParams).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findNearby(lat: number, lng: number, radiusKm: number, options: QueryOptions = {}): PaginatedResult<Post> {
    // Haversine formula for distance calculation
    const where = `WHERE deleted_at IS NULL AND location_lat IS NOT NULL AND location_lng IS NOT NULL AND
      (6371 * acos(cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat)))) <= ?`
    const params = [lat, lng, lat, radiusKm]
    
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<Post>(query, queryParams).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreatePostInput): Post {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, user_id, author_name, content, image_url, location_lat, location_lng, locality_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.user_id, input.author_name, input.content, input.image_url || null, 
       input.location_lat || null, input.location_lng || null, input.locality_id || null, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, content: string): Post | null {
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

  getUserPostCount(userId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    )
    return row?.count || 0
  }
}

export const postRepository = new PostRepository()