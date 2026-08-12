import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export type ReportReason = 'spam' | 'harassment' | 'personal_info' | 'malicious' | 'illegal' | 'copyright' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken'

export interface PasteReport {
  id: string
  paste_id: string
  reporter_id: string | null
  anonymous_token: string | null
  reason: ReportReason
  description: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: Date | null
  created_at: Date
}

export interface CreatePasteReportInput {
  paste_id: string
  reporter_id?: string
  anonymous_token?: string
  reason: ReportReason
  description?: string
}

export interface UpdatePasteReportInput {
  status?: ReportStatus
  reviewed_by?: string
  reviewed_at?: Date
}

export class PasteReportRepository extends BaseRepository {
  private table = 'paste_reports'

  findById(id: string): PasteReport | null {
    const row = this.executeQueryOne<PasteReport>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByPasteId(pasteId: string, options: QueryOptions = {}): PaginatedResult<PasteReport> {
    const where = 'WHERE paste_id = ?'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [pasteId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [pasteId])
    
    const items = this.executeQuery<PasteReport>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findAll(options: QueryOptions = {}, filters: { status?: ReportStatus } = {}): PaginatedResult<PasteReport> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<PasteReport>(query, queryParams).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreatePasteReportInput): PasteReport {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, paste_id, reporter_id, anonymous_token, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, input.paste_id, input.reporter_id || null, input.anonymous_token || null, input.reason, input.description || null, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: UpdatePasteReportInput): PasteReport | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status) }
    if (input.reviewed_by !== undefined) { updates.push('reviewed_by = ?'); params.push(input.reviewed_by) }
    if (input.reviewed_at !== undefined) { updates.push('reviewed_at = ?'); params.push(input.reviewed_at.toISOString()) }

    if (updates.length === 0) return existing

    params.push(id)
    this.executeRun(`UPDATE ${this.table} SET ${updates.join(', ')} WHERE id = ?`, params)
    return this.findById(id)
  }

  getPendingCount(): number {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE status = 'pending'`
    )
    return row?.count || 0
  }

  hasUserReported(pasteId: string, userId: string): boolean {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE paste_id = ? AND reporter_id = ?`,
      [pasteId, userId]
    )
    return (row?.count || 0) > 0
  }

  hasAnonymousReported(pasteId: string, token: string): boolean {
    const row = this.executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE paste_id = ? AND anonymous_token = ?`,
      [pasteId, token]
    )
    return (row?.count || 0) > 0
  }
}

export const pasteReportRepository = new PasteReportRepository()