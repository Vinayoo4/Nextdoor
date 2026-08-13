import { z } from 'zod'
import type { Request, Response } from 'express'
import { pasteRepository } from '../database/repositories/pasteRepository'
import { pasteCommentRepository } from '../database/repositories/pasteCommentRepository'
import { pasteReportRepository } from '../database/repositories/pasteReportRepository'
import { channelRepository } from '../database/repositories/channelRepository'
import { circleRepository } from '../database/repositories/circleRepository'
import { messageRepository } from '../database/repositories/messageRepository'
import { userRepository } from '../database/repositories/userRepository'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializePaste, serializePasteComment, serializeMessage } from '../utils/serializers'

const createPasteSchema = z.object({
  title: z.string().max(100).optional().or(z.literal('')),
  content: z.string().min(1, 'Content is required').max(100 * 1024, 'Paste must be under 100KB'),
  language: z.string().max(50).optional().or(z.literal('')),
  filename: z.string().max(100).optional().or(z.literal('')),
  visibility: z.enum(['public', 'unlisted', 'private', 'channel']).default('private'),
  expiresIn: z.enum(['none', '10m', '1h', '1d', '1w']).default('none'),
  channelId: z.string().optional(),
  societyId: z.string().optional(),
})

const updatePasteSchema = z.object({
  title: z.string().max(100).optional().or(z.literal('')),
  content: z.string().min(1, 'Content is required').max(100 * 1024, 'Paste must be under 100KB').optional(),
  language: z.string().max(50).optional().or(z.literal('')),
  filename: z.string().max(100).optional().or(z.literal('')),
  visibility: z.enum(['public', 'unlisted', 'private', 'channel']).optional(),
  expiresIn: z.enum(['none', '10m', '1h', '1d', '1w']).optional(),
})

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment must be under 1000 characters'),
})

const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'personal_info', 'malicious', 'illegal', 'copyright', 'other']),
  description: z.string().max(1000).optional().or(z.literal('')),
})

const listPastesSchema = z.object({
  search: z.string().optional(),
  language: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
})

function calculateExpiresAt(expiresIn: string): Date | null {
  const now = new Date()
  switch (expiresIn) {
    case '10m':
      return new Date(now.getTime() + 10 * 60 * 1000)
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000)
    case '1d':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case '1w':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'none':
    default:
      return null
  }
}

// Access check helper inside controller
function checkPasteAccess(req: Request, paste: any) {
  const userId = req.user?.id || null
  
  // Load channel & circle memberships if user is logged in
  let userChannelIds: string[] = []
  let userSocietyIds: string[] = []
  
  if (userId) {
    // Basic circles list
    const circlesResult = circleRepository.findByUserId(userId, { limit: 100 })
    userSocietyIds = circlesResult.items.map(c => c.id)
    
    // For simplicity, gather all channel ids for those circles
    for (const sId of userSocietyIds) {
      const chResult = channelRepository.findByCircleId(sId, { limit: 100 })
      userChannelIds.push(...chResult.items.map(ch => ch.id))
    }
  }

  const access = pasteRepository.checkAccess(paste, userId, userChannelIds, userSocietyIds)
  if (!access.allowed) {
    if (access.reason === 'deleted') throw new ApiError(404, 'Paste has been deleted')
    if (access.reason === 'expired') throw new ApiError(410, 'Paste has expired')
    if (access.reason === 'private') throw new ApiError(403, 'This paste is private')
    if (access.reason === 'unauthorized') throw new ApiError(403, 'You do not have access to this channel paste')
    throw new ApiError(403, 'Access denied')
  }
}

export const createPaste = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required to create a paste')
  const userId = req.user.id

  const { title, content, language, filename, visibility, expiresIn, channelId, societyId } = parseBody(req, createPasteSchema)

  // Verify channel/society membership if channel visibility or channelId is supplied
  let verifiedChannelId: string | null = null
  let verifiedSocietyId: string | null = null

  if (channelId) {
    const channel = channelRepository.findById(channelId)
    if (!channel) throw new ApiError(404, 'Channel not found')
    
    const isMember = circleRepository.isMember(channel.circle_id, userId)
    if (!isMember) throw new ApiError(403, 'You must be a member of this circle to share a paste here')
    
    verifiedChannelId = channel.id
    verifiedSocietyId = channel.circle_id
  } else if (societyId) {
    const isMember = circleRepository.isMember(societyId, userId)
    if (!isMember) throw new ApiError(403, 'You must be a member of this circle to share a paste')
    verifiedSocietyId = societyId
  }

  const expiresAt = calculateExpiresAt(expiresIn || 'none')
  const paste = pasteRepository.create({
    owner_id: userId,
    channel_id: verifiedChannelId || undefined,
    society_id: verifiedSocietyId || undefined,
    title: title || undefined,
    content,
    language: language || undefined,
    filename: filename || undefined,
    visibility,
    expires_at: expiresAt,
  })

  // If created inside chat channel, send chat message automatically
  let message = null
  if (verifiedChannelId) {
    const user = userRepository.findById(userId)
    message = messageRepository.create({
      channel_id: verifiedChannelId,
      user_id: userId,
      author_name: user?.name || 'Guest User',
      content: title || filename || 'Shared a paste',
      type: 'paste',
      paste_id: paste.id,
    })
  }

  res.status(201).json({
    paste: serializePaste(paste),
    message: message ? serializeMessage(message) : null
  })
})

export const getPaste = asyncHandler(async (req: Request, res: Response) => {
  const paste = pasteRepository.findByIdWithOwner(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  checkPasteAccess(req, paste)
  pasteRepository.incrementViewCount(paste.id)

  res.json({ paste: serializePaste(paste) })
})

export const getPasteRaw = asyncHandler(async (req: Request, res: Response) => {
  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  checkPasteAccess(req, paste)
  pasteRepository.incrementDownloadCount(paste.id) // track download/raw access

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(paste.content)
})

export const updatePaste = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'Authentication required')

  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  if (paste.owner_id !== userId && req.user?.role !== 'admin') {
    throw new ApiError(403, 'You can only update your own pastes')
  }

  const { title, content, language, filename, visibility, expiresIn } = parseBody(req, updatePasteSchema)
  
  const updates: any = { title, content, language, filename, visibility }
  if (expiresIn) {
    updates.expires_at = calculateExpiresAt(expiresIn)
  }

  const updated = pasteRepository.update(paste.id, updates)!
  res.json({ paste: serializePaste(updated) })
})

export const deletePaste = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'Authentication required')

  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  if (paste.owner_id !== userId && req.user?.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own pastes')
  }

  pasteRepository.softDelete(paste.id)
  res.json({ ok: true })
})

export const listPublicPastes = asyncHandler(async (req: Request, res: Response) => {
  const { search, language, page, limit } = listPastesSchema.parse(req.query)
  const pageNum = Math.max(page ?? 1, 1)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)
  const offset = (pageNum - 1) * pageSize

  const result = pasteRepository.findPublic({ limit: pageSize, offset }, { search, language })
  res.json({
    pastes: result.items.map(serializePaste),
    page: pageNum,
    pages: result.totalPages,
    total: result.total
  })
})

export const listMyPastes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'Authentication required')

  const { page, limit } = listPastesSchema.parse(req.query)
  const pageNum = Math.max(page ?? 1, 1)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)
  const offset = (pageNum - 1) * pageSize

  const result = pasteRepository.findByOwner(userId, { limit: pageSize, offset })
  res.json({
    pastes: result.items.map(serializePaste),
    page: pageNum,
    pages: result.totalPages,
    total: result.total
  })
})

export const listUserPastes = asyncHandler(async (req: Request, res: Response) => {
  // Finds public pastes of a specific user
  const user = userRepository.findByEmail(req.params.username) || userRepository.findById(req.params.username)
  if (!user) throw new ApiError(404, 'User not found')

  const { page, limit } = listPastesSchema.parse(req.query)
  const pageNum = Math.max(page ?? 1, 1)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)
  const offset = (pageNum - 1) * pageSize

  // We filter visibility = public only
  const conditions = `WHERE owner_id = ? AND visibility = 'public' AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))`
  const query = `SELECT p.*, u.name as owner_name FROM pastes p JOIN users u ON p.owner_id = u.id ${conditions} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  const countQuery = `SELECT COUNT(*) as count FROM pastes WHERE owner_id = ? AND visibility = 'public' AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))`

  const items = pasteRepository['executeQuery']<any>(query, [user.id, pageSize, offset]).map(r => pasteRepository['deserializeDates'](r))
  const total = pasteRepository['executeQueryOne']<{ count: number }>(countQuery, [user.id])?.count || 0

  res.json({
    pastes: items.map(serializePaste),
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    total
  })
})

export const reportPaste = asyncHandler(async (req: Request, res: Response) => {
  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  const { reason, description } = parseBody(req, reportSchema)
  const reporterId = req.user?.id || null

  pasteReportRepository.create({
    paste_id: paste.id,
    reporter_id: reporterId || undefined,
    reason,
    description: description || undefined,
  })

  res.status(201).json({ ok: true, message: 'Report submitted successfully' })
})

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  checkPasteAccess(req, paste)

  const result = pasteCommentRepository.findByPasteId(paste.id, { limit: 100 })
  res.json({ comments: result.items.map(serializePasteComment) })
})

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'Authentication required to post comments')

  const paste = pasteRepository.findById(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  checkPasteAccess(req, paste)

  const { content } = parseBody(req, commentSchema)
  const comment = pasteCommentRepository.create({
    paste_id: paste.id,
    user_id: userId,
    content,
  })

  // Reload comment to include username
  const user = userRepository.findById(userId)
  const commentWithUser = {
    ...comment,
    user_name: user?.name || 'Guest User'
  }

  res.status(201).json({ comment: serializePasteComment(commentWithUser) })
})
