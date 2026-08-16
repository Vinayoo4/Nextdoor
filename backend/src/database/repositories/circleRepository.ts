import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Circle {
  id: string
  name: string
  description: string
  creator_id: string
  pin: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateCircleInput {
  name: string
  description?: string
  creator_id: string
  pin?: string
}

export class CircleRepository extends BaseRepository {
  private table = 'circles'

  findById(id: string): Circle | null {
    const row = this.executeQueryOne<Circle>(`SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findAll(options: QueryOptions = {}): PaginatedResult<Circle> {
    const where = 'WHERE deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where)
    
    const items = this.executeQuery<Circle>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findByUserId(userId: string, options: QueryOptions = {}): PaginatedResult<Circle> {
    const where = `WHERE c.deleted_at IS NULL AND cm.user_id = ?`
    const query = `
      SELECT c.* FROM ${this.table} c
      JOIN circle_members cm ON c.id = cm.circle_id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `
    const countQuery = `
      SELECT COUNT(*) as count FROM ${this.table} c
      JOIN circle_members cm ON c.id = cm.circle_id
      ${where}
    `
    
    const items = this.executeQuery<Circle>(query, [userId, options.limit || 50, options.offset || 0]).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, [userId])?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateCircleInput): Circle {
    const id = generateId()
    const timestamp = now()
    
    this.executeTransaction(() => {
      this.executeRun(
        `INSERT INTO ${this.table} (id, name, description, creator_id, pin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.name, input.description || '', input.creator_id, input.pin || null, timestamp, timestamp]
      )
      
      // Add creator as member
      this.executeRun(
        `INSERT INTO circle_members (id, circle_id, user_id, role, joined_at)
         VALUES (?, ?, ?, 'admin', ?)`,
        [generateId(), id, input.creator_id, timestamp]
      )

      // Add Super Admin as secondary admin if creator is not Super Admin
      if (input.creator_id !== 'super_admin_id') {
        this.executeRun(
          `INSERT INTO circle_members (id, circle_id, user_id, role, joined_at)
           VALUES (?, ?, 'super_admin_id', 'admin', ?)`,
          [generateId(), id, timestamp]
        )
      }
    })
    
    return this.findById(id)!
  }

  update(id: string, name: string, description: string): Circle | null {
    const existing = this.findById(id)
    if (!existing) return null

    this.executeRun(
      `UPDATE ${this.table} SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
      [name, description, now(), id]
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

  getChannelCount(circleId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM channels WHERE circle_id = ? AND deleted_at IS NULL`,
      [circleId]
    )
    return row?.count || 0
  }

  getMemberCount(circleId: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ?`,
      [circleId]
    )
    return row?.count || 0
  }

  isMember(circleId: string, userId: string): boolean {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ? AND user_id = ?`,
      [circleId, userId]
    )
    return (row?.count || 0) > 0
  }

  addMember(circleId: string, userId: string, role: 'member' | 'elder' | 'co_admin' | 'admin' = 'member'): boolean {
    try {
      this.executeRun(
        `INSERT INTO circle_members (id, circle_id, user_id, role, joined_at)
         VALUES (?, ?, ?, ?, ?)`,
        [generateId(), circleId, userId, role, now()]
      )
      return true
    } catch {
      return false
    }
  }

  removeMember(circleId: string, userId: string): boolean {
    const result = this.executeRun(
      `DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?`,
      [circleId, userId]
    )
    return result.changes > 0
  }

  getMembers(circleId: string): Array<{ user_id: string; role: string; joined_at: Date }> {
    return this.executeQuery<{ user_id: string; role: string; joined_at: Date }>(
      `SELECT user_id, role, joined_at FROM circle_members WHERE circle_id = ? ORDER BY joined_at`,
      [circleId]
    ).map(r => this.deserializeDates(r))
  }

  updatePin(circleId: string, pin: string | null): boolean {
    const result = this.executeRun(
      `UPDATE circles SET pin = ?, updated_at = ? WHERE id = ?`,
      [pin, now(), circleId]
    )
    return result.changes > 0
  }

  getRole(circleId: string, userId: string): string | null {
    const row = this.executeQueryOne<{ role: string }>(
      `SELECT role FROM circle_members WHERE circle_id = ? AND user_id = ?`,
      [circleId, userId]
    )
    return row?.role || null
  }

  countMembersWithRole(circleId: string, role: string): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ? AND role = ?`,
      [circleId, role]
    )
    return row?.count || 0
  }

  updateMemberRole(circleId: string, userId: string, role: 'member' | 'elder' | 'co_admin' | 'admin'): boolean {
    const result = this.executeRun(
      `UPDATE circle_members SET role = ? WHERE circle_id = ? AND user_id = ?`,
      [role, circleId, userId]
    )
    return result.changes > 0
  }

  createRequest(circleId: string, userId: string): boolean {
    try {
      this.executeRun(
        `INSERT INTO circle_requests (id, circle_id, user_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?)
         ON CONFLICT(circle_id, user_id) DO UPDATE SET status = 'pending', updated_at = ?`,
        [generateId(), circleId, userId, now(), now(), now()]
      )
      return true
    } catch {
      return false
    }
  }

  getRequest(circleId: string, userId: string): any {
    return this.executeQueryOne(
      `SELECT * FROM circle_requests WHERE circle_id = ? AND user_id = ?`,
      [circleId, userId]
    )
  }

  getRequestById(requestId: string): any {
    return this.executeQueryOne(
      `SELECT * FROM circle_requests WHERE id = ?`,
      [requestId]
    )
  }

  getPendingRequests(circleId: string): any[] {
    return this.executeQuery(
      `SELECT cr.*, u.name as user_name, u.email as user_email 
       FROM circle_requests cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.circle_id = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [circleId]
    )
  }

  updateRequestStatus(requestId: string, status: 'approved' | 'rejected'): boolean {
    const result = this.executeRun(
      `UPDATE circle_requests SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now(), requestId]
    )
    return result.changes > 0
  }
}

export const circleRepository = new CircleRepository()