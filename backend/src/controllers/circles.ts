import { z } from 'zod'
import type { Request, Response } from 'express'
import { circleRepository } from '../database/repositories/circleRepository'
import { channelRepository } from '../database/repositories/channelRepository'
import { messageRepository } from '../database/repositories/messageRepository'
import { userRepository } from '../database/repositories/userRepository'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializeChannel, serializeMessage } from '../utils/serializers'

const createCircleSchema = z.object({
  name: z.string().min(1, 'Circle name is required').max(60),
  description: z.string().max(300).optional().or(z.literal('')),
  initialChannel: z.string().min(1).max(60).optional().or(z.literal('')),
})

const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(60),
})

const createMessageSchema = z.object({
  content: z.string().min(1, 'Message is required').max(1000),
})

export const listCircles = asyncHandler(async (_req: Request, res: Response) => {
  const result = circleRepository.findAll()
  const circles = result.items.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    channelCount: circleRepository.getChannelCount(c.id),
    createdAt: c.created_at,
  }))

  res.json({ circles })
})

export const createCircle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const { name, description, initialChannel } = parseBody(req, createCircleSchema)

  const circle = circleRepository.create({
    name,
    description: description ?? '',
    creator_id: userId,
  })

  let channel = null
  if (initialChannel && initialChannel.trim()) {
    channel = channelRepository.create({
      name: initialChannel.trim(),
      circle_id: circle.id
    })
  }

  res.status(201).json({
    circle: {
      id: circle.id,
      name,
      description: description ?? '',
      channelCount: channel ? 1 : 0,
      createdAt: circle.created_at,
    },
    channel: channel ? serializeChannel(channel) : null,
  })
})

export const listChannels = asyncHandler(async (req: Request, res: Response) => {
  const result = channelRepository.findByCircleId(req.params.id, { limit: 100 })
  res.json({ channels: result.items.map(serializeChannel) })
})

export const createChannel = asyncHandler(async (req: Request, res: Response) => {
  const { name } = parseBody(req, createChannelSchema)
  const circle = circleRepository.findById(req.params.id)
  if (!circle) throw new ApiError(404, 'Circle not found')

  const channel = channelRepository.create({ name, circle_id: circle.id })
  res.status(201).json({ channel: serializeChannel(channel) })
})

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = messageRepository.findByChannelId(req.params.id, { limit: 200, orderBy: 'created_at', orderDir: 'ASC' })
  res.json({ messages: result.items.map(serializeMessage) })
})

export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const { content } = parseBody(req, createMessageSchema)
  const channel = channelRepository.findById(req.params.id)
  if (!channel) throw new ApiError(404, 'Channel not found')

  const user = req.user ? userRepository.findById(userId) : null

  const message = messageRepository.create({
    content,
    channel_id: channel.id,
    user_id: userId,
    author_name: user?.name || 'Guest User',
    type: 'text'
  })

  res.status(201).json({ message: serializeMessage(message) })
})
