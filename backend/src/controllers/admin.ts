import { z } from 'zod'
import type { Request, Response } from 'express'
import { businessClaimRepository } from '../database/repositories/businessClaimRepository'
import { businessRepository } from '../database/repositories/businessRepository'
import { userRepository } from '../database/repositories/userRepository'
import { getDatabase } from '../database/connection'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { requireUserId } from '../middleware/auth'

const reviewClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(500).optional().or(z.literal('')),
})

export const listClaimRequests = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as any
  const result = businessClaimRepository.findAll({ limit: 100 }, { status })
  
  // Enrich requests with business name and requester name
  const db = getDatabase()
  const enrichedItems = result.items.map((item: any) => {
    const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(item.business_id) as any
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(item.requester_id) as any
    return {
      ...item,
      businessName: biz?.name || 'Unknown Business',
      requesterName: user?.name || 'Unknown User',
      requesterEmail: user?.email || 'Unknown Email',
    }
  })

  res.json({ claims: enrichedItems })
})

export const reviewClaim = asyncHandler(async (req: Request, res: Response) => {
  const { status, adminNote } = parseBody(req, reviewClaimSchema)
  const claimId = req.params.id
  const adminId = requireUserId(req)

  const claim = businessClaimRepository.findById(claimId)
  if (!claim) throw new ApiError(404, 'Claim request not found')
  if (claim.status !== 'pending') throw new ApiError(400, 'This claim has already been reviewed')

  const business = businessRepository.findById(claim.business_id)
  if (!business) throw new ApiError(404, 'Business not found')

  // Run updates in transaction
  const db = getDatabase()
  db.transaction(() => {
    // 1. Update claim status
    businessClaimRepository.update(claimId, {
      status,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      admin_note: adminNote || undefined
    })

    // 2. If approved, verify business and assign owner
    if (status === 'approved') {
      businessRepository.update(claim.business_id, {
        owner_id: claim.requester_id,
        verified: true,
        status: 'active'
      })

      // Upgrade user role to owner if they are a regular user
      const user = userRepository.findById(claim.requester_id)
      if (user && user.role === 'user') {
        userRepository.update(claim.requester_id, { role: 'owner' })
      }
    }

    // 3. Log audit action in business_verification_events
    const eventId = Math.random().toString(36).substring(2, 15)
    db.prepare(
      `INSERT INTO business_verification_events (id, business_id, admin_id, action, note)
       VALUES (?, ?, ?, ?, ?)`
    ).run(eventId, claim.business_id, adminId, `claim_${status}`, adminNote || `Claim request reviewed: ${status}`)
  })()

  res.json({ ok: true, message: `Claim ${status} successfully` })
})

export const getVerificationLog = asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase()
  const rows = db.prepare(
    `SELECT e.*, b.name as business_name, u.name as admin_name FROM business_verification_events e
     JOIN businesses b ON e.business_id = b.id
     JOIN users u ON e.admin_id = u.id
     ORDER BY e.created_at DESC LIMIT 100`
  ).all() as any[]

  res.json({ logs: rows })
})

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase()
  const rows = db.prepare(
    `SELECT a.*, u.name as user_name, u.email as user_email FROM api_audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ORDER BY a.created_at DESC LIMIT 200`
  ).all() as any[]

  const logs = rows.map((r: any) => {
    let parsedHeaders = {}
    let parsedQuery = {}
    try { parsedHeaders = JSON.parse(r.headers || '{}') } catch {}
    try { parsedQuery = JSON.parse(r.query || '{}') } catch {}
    
    return {
      id: r.id,
      method: r.method,
      url: r.url,
      statusCode: r.status_code,
      responseTime: r.response_time,
      ip: r.ip,
      userId: r.user_id,
      userName: r.user_name || 'Anonymous / Guest',
      userEmail: r.user_email || '—',
      headers: parsedHeaders,
      query: parsedQuery,
      createdAt: r.created_at
    }
  })

  res.json({ logs })
})
