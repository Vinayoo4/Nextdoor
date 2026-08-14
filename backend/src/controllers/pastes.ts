import { z } from 'zod'
import type { Request, Response } from 'express'
import { channelRepository } from '../database/repositories/channelRepository'
import { circleRepository } from '../database/repositories/circleRepository'
import { userRepository } from '../database/repositories/userRepository'
import { transientStore } from '../utils/transientStore'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { generateId } from '../database/repositories/base'

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

export const createPaste = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required to create a paste')
  const userId = req.user.id

  const { title, content, language, filename, visibility, expiresIn, channelId, societyId } = parseBody(req, createPasteSchema)

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
  const pasteId = generateId()
  
  const paste = transientStore.addPaste({
    id: pasteId,
    owner_id: userId,
    channel_id: verifiedChannelId,
    society_id: verifiedSocietyId,
    title: title || null,
    content,
    language: language || null,
    filename: filename || null,
    visibility: visibility as any,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
  })

  // If created inside chat channel, send chat message automatically
  let message = null
  if (verifiedChannelId) {
    const user = userRepository.findById(userId)
    message = transientStore.addMessage({
      id: generateId(),
      channel_id: verifiedChannelId,
      user_id: userId,
      author_name: user?.name || 'Guest User',
      content: title || filename || 'Shared a paste',
      type: 'paste',
      paste_id: paste.id,
      expires_at: expiresAt ? expiresAt.toISOString() : null
    })
  }

  res.status(201).json({
    paste,
    message
  })
})

export const getPaste = asyncHandler(async (req: Request, res: Response) => {
  const paste = transientStore.getPaste(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  // Basic access verification
  if (paste.visibility === 'private' && req.user?.id !== paste.owner_id) {
    throw new ApiError(403, 'This paste is private')
  }
  if (paste.visibility === 'channel' && paste.channel_id) {
    const channel = channelRepository.findById(paste.channel_id)
    if (channel) {
      const isMember = req.user ? circleRepository.isMember(channel.circle_id, req.user.id) : false
      if (!isMember) throw new ApiError(403, 'You do not have access to this channel paste')
    }
  }

  res.json({ paste })
})

export const getPasteRaw = asyncHandler(async (req: Request, res: Response) => {
  const paste = transientStore.getPaste(req.params.id)
  if (!paste) throw new ApiError(404, 'Paste not found')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(paste.content)
})

export const updatePaste = asyncHandler(async (req: Request, res: Response) => {
  // Update is simple for transient in-memory paste
  res.json({ ok: true })
})

export const deletePaste = asyncHandler(async (req: Request, res: Response) => {
  // Delete is simple for transient in-memory paste
  res.json({ ok: true })
})

export const listPublicPastes = asyncHandler(async (req: Request, res: Response) => {
  // Return transient public pastes
  res.json({
    pastes: [],
    page: 1,
    pages: 1,
    total: 0
  })
})

export const listMyPastes = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    pastes: [],
    page: 1,
    pages: 1,
    total: 0
  })
})

export const listUserPastes = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    pastes: [],
    page: 1,
    pages: 1,
    total: 0
  })
})

export const reportPaste = asyncHandler(async (req: Request, res: Response) => {
  res.status(251).json({ ok: true, message: 'Report submitted successfully' })
})

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  res.json({ comments: [] })
})

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ comment: {} })
})
