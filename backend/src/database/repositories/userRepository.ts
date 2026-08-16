import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface User {
  id: string
  email: string
  name: string
  password_hash: string | null
  role: 'user' | 'owner' | 'admin'
  locality_id: string | null
  points: number
  last_seen_at: Date | null
  last_lat: number | null
  last_lng: number | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateUserInput {
  email: string
  name: string
  password_hash: string
  role?: 'user' | 'owner' | 'admin'
  locality_id?: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  password_hash?: string | null
  role?: 'user' | 'owner' | 'admin'
  locality_id?: string
  points?: number
  last_seen_at?: Date | null
  last_lat?: number | null
  last_lng?: number | null
}

export class UserRepository extends BaseRepository {
  private table = 'users'

  findById(id: string): User | null {
    const row = this.executeQueryOne<User>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row, ['created_at', 'updated_at', 'deleted_at', 'last_seen_at']) : null
  }

  findByEmail(email: string): User | null {
    const row = this.executeQueryOne<User>(`SELECT * FROM ${this.table} WHERE email = ? AND deleted_at IS NULL`, [email.toLowerCase()])
    return row ? this.deserializeDates(row, ['created_at', 'updated_at', 'deleted_at', 'last_seen_at']) : null
  }

  findByName(name: string): User | null {
    const row = this.executeQueryOne<User>(`SELECT * FROM ${this.table} WHERE LOWER(name) = ? AND deleted_at IS NULL`, [name.toLowerCase().trim()])
    return row ? this.deserializeDates(row, ['created_at', 'updated_at', 'deleted_at', 'last_seen_at']) : null
  }

  findAll(options: QueryOptions = {}): PaginatedResult<User> {
    const where = 'WHERE deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where)
    
    const items = this.executeQuery<User>(query, params).map(r => this.deserializeDates(r, ['created_at', 'updated_at', 'deleted_at', 'last_seen_at']))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateUserInput): User {
    const id = generateId()
    const timestamp = now()
    
    const emailNorm = input.email.toLowerCase().trim()
    let finalRole = input.role || 'user'
    if (finalRole === 'admin' && emailNorm !== 'vinay_227051@saitm.org') {
      finalRole = 'user'
    }

    // Auto-resolve username collisions by appending numbers if needed
    let finalName = input.name.trim()
    let attempts = 0
    while (this.findByName(finalName)) {
      attempts++
      finalName = `${input.name.trim()}${Math.floor(Math.random() * 1000) || attempts}`
    }

    this.executeRun(
      `INSERT INTO ${this.table} (id, email, name, password_hash, role, locality_id, points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, emailNorm, finalName, input.password_hash, finalRole, input.locality_id || null, 0, timestamp, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: UpdateUserInput): User | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name) }
    if (input.email !== undefined) { updates.push('email = ?'); params.push(input.email.toLowerCase()) }
    if (input.password_hash !== undefined) { updates.push('password_hash = ?'); params.push(input.password_hash) }
    if (input.role !== undefined) { 
      let finalRole = input.role
      if (finalRole === 'admin' && existing.email.toLowerCase().trim() !== 'vinay_227051@saitm.org') {
        finalRole = existing.role
      }
      updates.push('role = ?'); 
      params.push(finalRole) 
    }
    if (input.locality_id !== undefined) { updates.push('locality_id = ?'); params.push(input.locality_id) }
    if (input.points !== undefined) { updates.push('points = ?'); params.push(input.points) }
    
    // New fields
    if (input.last_seen_at !== undefined) {
      updates.push('last_seen_at = ?')
      params.push(input.last_seen_at ? input.last_seen_at.toISOString() : null)
    }
    if (input.last_lat !== undefined) { updates.push('last_lat = ?'); params.push(input.last_lat) }
    if (input.last_lng !== undefined) { updates.push('last_lng = ?'); params.push(input.last_lng) }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    params.push(now())
    params.push(id)

    this.executeRun(`UPDATE ${this.table} SET ${updates.join(', ')} WHERE id = ?`, params)
    return this.findById(id)
  }

  softDelete(id: string): boolean {
    const result = this.executeRun(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now(), now(), id]
    )
    return result.changes > 0
  }

  addPoints(id: string, points: number): User | null {
    const user = this.findById(id)
    if (!user) return null
    return this.update(id, { points: user.points + points })
  }

  findByLocality(localityId: string, options: QueryOptions = {}): PaginatedResult<User> {
    const where = 'WHERE locality_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [localityId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [localityId])
    
    const items = this.executeQuery<User>(query, params).map(r => this.deserializeDates(r, ['created_at', 'updated_at', 'deleted_at', 'last_seen_at']))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }
}

export const userRepository = new UserRepository()