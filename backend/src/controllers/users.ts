import type { Request, Response } from 'express'
import { userRepository } from '../database/repositories/userRepository'
import { postRepository } from '../database/repositories/postRepository'
import { messageRepository } from '../database/repositories/messageRepository'
import { channelRepository } from '../database/repositories/channelRepository'
import { circleRepository } from '../database/repositories/circleRepository'
import { transientStore } from '../utils/transientStore'
import { ApiError, asyncHandler } from '../utils/errors'
import { requireUserId } from '../middleware/auth'

const MASKED_CONTENT = 'xxxx'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '••••'
  const head = local.slice(0, Math.min(1, local.length))
  return `${head}${'•'.repeat(Math.max(1, local.length - 1))}@${domain}`
}

function fmtDate(v: unknown): string | null {
  if (!v) return null
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function resolveChannelLabel(channelId: string): { channelName: string; circleId: string; circleName: string } {
  const channel = channelRepository.findById(channelId)
  if (!channel) {
    return { channelName: 'Deleted channel', circleId: '', circleName: '' }
  }
  const circle = circleRepository.findById(channel.circle_id)
  return {
    channelName: channel.name,
    circleId: channel.circle_id,
    circleName: circle?.name || '',
  }
}

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const viewerId = requireUserId(req)
  const targetId = req.params.id

  const target = userRepository.findById(targetId)
  if (!target) throw new ApiError(404, 'User not found')

  const isSelf = viewerId === targetId
  const isAdmin = req.user?.role === 'admin'
  const canViewFull = isAdmin || isSelf
  const masked = !canViewFull

  // ---- Timeline (posts) ----
  const dbPosts = postRepository.findAll({ limit: 200, orderBy: 'created_at', orderDir: 'DESC' }, { user_id: targetId }).items
  const transientPosts = transientStore
    .getPosts()
    .filter((p) => p.user_id === targetId)

  const postMap = new Map<string, any>()
  for (const p of dbPosts) postMap.set(p.id, p)
  for (const p of transientPosts) {
    if (!postMap.has(p.id)) postMap.set(p.id, p)
  }

  const timeline = [...postMap.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((p) => ({
      id: p.id,
      content: masked ? MASKED_CONTENT : p.content,
      createdAt: fmtDate(p.created_at),
    }))

  // ---- Chats (messages) ----
  const dbMessages = messageRepository.findByUserId(targetId, { limit: 500, orderBy: 'created_at', orderDir: 'DESC' }).items
  // Transient messages are keyed by channel in transientStore; gather across channels.
  const transientMessages = transientStore.getMessagesByUserId(targetId)

  const messageMap = new Map<string, any>()
  for (const m of dbMessages) messageMap.set(m.id, m)
  for (const m of transientMessages) {
    if (!messageMap.has(m.id)) messageMap.set(m.id, m)
  }

  const chats = [...messageMap.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 500)
    .map((m) => {
      const label = resolveChannelLabel(m.channel_id)
      return {
        id: m.id,
        content: masked ? MASKED_CONTENT : m.content,
        type: m.type ?? 'text',
        channelId: m.channel_id,
        channelName: label.channelName,
        circleId: label.circleId,
        circleName: label.circleName,
        createdAt: fmtDate(m.created_at),
        expiresAt: m.expires_at ? fmtDate(m.expires_at) : null,
      }
    })

  const email = canViewFull ? target.email : maskEmail(target.email || '')

  res.json({
    user: {
      id: target.id,
      name: target.name,
      email,
      role: target.role,
      points: target.points ?? 0,
      createdAt: fmtDate(target.created_at),
    },
    masked,
    isSelf,
    stats: {
      posts: timeline.length,
      messages: chats.length,
    },
    timeline,
    chats,
  })
})

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = userRepository.findAll({ limit: 500, orderBy: 'created_at', orderDir: 'DESC' })

  const users = result.items.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    points: u.points ?? 0,
    createdAt: fmtDate(u.created_at),
    postCount: postRepository.getUserPostCount(u.id),
    messageCount: messageRepository.getUserMessageCount(u.id),
  }))

  res.json({ users, total: result.total })
})
