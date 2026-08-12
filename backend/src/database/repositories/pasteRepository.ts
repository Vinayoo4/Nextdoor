import { BaseRepository, generateId, now, QueryOptions, PaginatedResult, isDeleted } from './base'

export type PasteVisibility = 'public' | 'unlisted' | 'private' | 'channel'

export interface Paste {
  id: string
  owner_id: string
  channel_id: string | null
  society_id: string | null
  title: string | null
  content: string
  language: string | null
  filename: string | null
  visibility: PasteVisibility
  expires_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  content_size: number
  line_count: number
  view_count: number
  copy_count: number
  download_count: number
}

export interface PasteWithOwner extends Paste {
  owner_name: string
}

export interface CreatePasteInput {
  owner_id: string
  channel_id?: string
  society_id?: string
  title?: string
  content: string
  language?: string
  filename?: string
  visibility?: PasteVisibility
  expires_at?: Date | null
}

export interface UpdatePasteInput {
  title?: string
  content?: string
  language?: string
  filename?: string
  visibility?: PasteVisibility
  expires_at?: Date | null
}

export interface PasteAccessCheck {
  allowed: boolean
  reason?: 'deleted' | 'expired' | 'private' | 'unauthorized' | 'not_found'
}

export class PasteRepository extends BaseRepository {
  private table = 'pastes'

  findById(id: string): Paste | null {
    const row = this.executeQueryOne<Paste>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByIdWithOwner(id: string): PasteWithOwner | null {
    const row = this.executeQueryOne<PasteWithOwner>(
      `SELECT p.*, u.name as owner_name FROM ${this.table} p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`,
      [id]
    )
    return row ? this.deserializeDates(row) : null
  }

  findPublic(options: QueryOptions = {}, filters: { language?: string; search?: string } = {}): PaginatedResult<PasteWithOwner> {
    const conditions: string[] = [
      'p.deleted_at IS NULL',
      'p.visibility = \'public\'',
      '(p.expires_at IS NULL OR p.expires_at > datetime(\'now\'))'
    ]
    const params: unknown[] = []

    if (filters.language) {
      conditions.push('p.language = ?')
      params.push(filters.language)
    }
    if (filters.search) {
      conditions.push('(p.title LIKE ? OR p.content LIKE ?)')
      const term = `%${filters.search}%`
      params.push(term, term)
    }

    const where = `WHERE ${conditions.join(' AND ')}`
    const query = `
      SELECT p.*, u.name as owner_name FROM ${this.table} p
      JOIN users u ON p.owner_id = u.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `
    const countQuery = `
      SELECT COUNT(*) as count FROM ${this.table} p
      JOIN users u ON p.owner_id = u.id
      ${where}
    `
    
    const items = this.executeQuery<PasteWithOwner>(query, [...params, options.limit || 20, options.offset || 0]).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, params)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      pageSize: options.limit || 20,
      totalPages: Math.ceil(total / (options.limit || 20))
    }
  }

  findByOwner(ownerId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    const where = 'WHERE owner_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [ownerId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [ownerId])
    
    const items = this.executeQuery<Paste>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findByChannel(channelId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    const where = 'WHERE channel_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [channelId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [channelId])
    
    const items = this.executeQuery<Paste>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findBySociety(societyId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    const where = 'WHERE society_id = ? AND deleted_at IS NULL'
    const { query, params } = this.buildSelectQuery(this.table, options, where, [societyId])
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, [societyId])
    
    const items = this.executeQuery<Paste>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreatePasteInput): Paste {
    const id = generateId()
    const timestamp = now()
    const contentSize = Buffer.byteLength(input.content, 'utf8')
    const lineCount = input.content.split('\n').length
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, owner_id, channel_id, society_id, title, content, language, filename, visibility, expires_at, created_at, updated_at, content_size, line_count, view_count, copy_count, download_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        id, input.owner_id, input.channel_id || null, input.society_id || null,
        input.title || null, input.content, input.language || null, input.filename || null,
        input.visibility || 'private', input.expires_at ? input.expires_at.toISOString() : null,
        timestamp, timestamp, contentSize, lineCount
      ]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: UpdatePasteInput): Paste | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title || null) }
    if (input.content !== undefined) { 
      updates.push('content = ?'); params.push(input.content)
      updates.push('content_size = ?'); params.push(Buffer.byteLength(input.content, 'utf8'))
      updates.push('line_count = ?'); params.push(input.content.split('\n').length)
    }
    if (input.language !== undefined) { updates.push('language = ?'); params.push(input.language || null) }
    if (input.filename !== undefined) { updates.push('filename = ?'); params.push(input.filename || null) }
    if (input.visibility !== undefined) { updates.push('visibility = ?'); params.push(input.visibility) }
    if (input.expires_at !== undefined) { updates.push('expires_at = ?'); params.push(input.expires_at ? input.expires_at.toISOString() : null) }

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

  incrementViewCount(id: string): void {
    this.executeRun(
      `UPDATE ${this.table} SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    )
  }

  incrementCopyCount(id: string): void {
    this.executeRun(
      `UPDATE ${this.table} SET copy_count = copy_count + 1 WHERE id = ?`,
      [id]
    )
  }

  incrementDownloadCount(id: string): void {
    this.executeRun(
      `UPDATE ${this.table} SET download_count = download_count + 1 WHERE id = ?`,
      [id]
    )
  }

  recordView(pasteId: string, viewerId: string | null, ipHash: string | null): void {
    this.executeRun(
      `INSERT INTO paste_views (paste_id, viewer_id, ip_hash, created_at) VALUES (?, ?, ?, ?)`,
      [pasteId, viewerId, ipHash, now()]
    )
    this.incrementViewCount(pasteId)
  }

  checkAccess(paste: Paste, userId: string | null, userChannelIds: string[] = [], userSocietyIds: string[] = []): PasteAccessCheck {
    if (paste.deleted_at) return { allowed: false, reason: 'deleted' }
    if (paste.expires_at && new Date(paste.expires_at) < new Date()) return { allowed: false, reason: 'expired' }

    switch (paste.visibility) {
      case 'public':
      case 'unlisted':
        return { allowed: true }
      case 'private':
        return { allowed: paste.owner_id === userId, reason: paste.owner_id === userId ? undefined : 'private' }
      case 'channel':
        if (paste.channel_id && userChannelIds.includes(paste.channel_id)) return { allowed: true }
        if (paste.society_id && userSocietyIds.includes(paste.society_id)) return { allowed: true }
        return { allowed: false, reason: 'unauthorized' }
      default:
        return { allowed: false, reason: 'not_found' }
    }
  }

  getLanguages(): string[] {
    const rows = this.executeQuery<{ language: string }>(
      `SELECT DISTINCT language FROM ${this.table} WHERE language IS NOT NULL AND deleted_at IS NULL ORDER BY language`
    )
    return rows.map(r => r.language)
  }

  getPopular(limit: number = 10): PasteWithOwner[] {
    const rows = this.executeQuery<PasteWithOwner>(
      `SELECT p.*, u.name as owner_name FROM ${this.table} p
       JOIN users u ON p.owner_id = u.id
       WHERE p.visibility = 'public' AND p.deleted_at IS NULL AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
       ORDER BY p.view_count DESC, p.created_at DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(r => this.deserializeDates(r))
  }

  getExpiringSoon(hours: number = 24): Paste[] {
    const future = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    const rows = this.executeQuery<Paste>(
      `SELECT * FROM ${this.table} WHERE visibility = 'public' AND deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ? AND expires_at > datetime('now') ORDER BY expires_at`,
      [future]
    )
    return rows.map(r => this.deserializeDates(r))
  }
}

export const pasteRepository = new PasteRepository()