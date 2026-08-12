import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface BusinessClaimRequest {
  id: string
  business_id: string
  requester_id: string
  private_contact_name: string | null
  private_contact_phone: string | null
  private_contact_email: string | null
  verification_note: string | null
  evidence_reference: string | null
  status: ClaimStatus
  reviewed_by: string | null
  reviewed_at: Date | null
  admin_note: string | null
  created_at: Date
}

export interface CreateBusinessClaimInput {
  business_id: string
  requester_id: string
  private_contact_name?: string
  private_contact_phone?: string
  private_contact_email?: string
  verification_note?: string
  evidence_reference?: string
}

export interface UpdateBusinessClaimInput {
  status?: ClaimStatus
  reviewed_by?: string
  reviewed_at?: Date
  admin_note?: string
}

export class BusinessClaimRepository extends BaseRepository {
  private table = 'business_claim_requests'

  findById(id: string): BusinessClaimRequest | null {
    const row = this.executeQueryOne<BusinessClaimRequest>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByBusinessId(businessId: string): BusinessClaimRequest | null {
    const row = this.executeQueryOne<BusinessClaimRequest>(
      `SELECT * FROM ${this.table} WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`,
      [businessId]
    )
    return row ? this.deserializeDates(row) : null
  }

  findByRequesterId(requesterId: string): BusinessClaimRequest[] {
    const rows = this.executeQuery<BusinessClaimRequest>(
      `SELECT * FROM ${this.table} WHERE requester_id = ? ORDER BY created_at DESC`,
      [requesterId]
    )
    return rows.map(r => this.deserializeDates(r))
  }

  findAll(options: QueryOptions = {}, filters: { status?: ClaimStatus } = {}): PaginatedResult<BusinessClaimRequest> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<BusinessClaimRequest>(query, queryParams).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateBusinessClaimInput): BusinessClaimRequest {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, business_id, requester_id, private_contact_name, private_contact_phone, private_contact_email, verification_note, evidence_reference, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, input.business_id, input.requester_id, input.private_contact_name || null, input.private_contact_phone || null, input.private_contact_email || null, input.verification_note || null, input.evidence_reference || null, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: UpdateBusinessClaimInput): BusinessClaimRequest | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status) }
    if (input.reviewed_by !== undefined) { updates.push('reviewed_by = ?'); params.push(input.reviewed_by) }
    if (input.reviewed_at !== undefined) { updates.push('reviewed_at = ?'); params.push(input.reviewed_at.toISOString()) }
    if (input.admin_note !== undefined) { updates.push('admin_note = ?'); params.push(input.admin_note) }

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
}

export const businessClaimRepository = new BusinessClaimRepository()