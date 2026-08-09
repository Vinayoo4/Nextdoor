import { z } from 'zod'
import type { Request, Response } from 'express'
import { Circle } from '../models/Circle'
import { Channel } from '../models/Channel'
import { Message } from '../models/Message'
import { User } from '../models/User'
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
  const circles = await Circle.find().sort({ createdAt: -1 }).lean()
  const counts = await Channel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$circleId', count: { $sum: 1 } } },
  ])
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]))

  res.json({
    circles: circles.map((c) => ({
      id: String(c._id),
      name: c.name,
      description: c.description,
      channelCount: countMap.get(String(c._id)) ?? 0,
      createdAt: c.createdAt,
    })),
  })
})

export const createCircle = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const { name, description, initialChannel } = parseBody(req, createCircleSchema)

  const circle = await Circle.create({
    name,
    description: description ?? '',
    creatorId: req.user.id,
    memberIds: [req.user.id],
  })

  let channel = null
  if (initialChannel && initialChannel.trim()) {
    channel = await Channel.create({ name: initialChannel.trim(), circleId: circle._id })
  }

  res.status(201).json({
    circle: {
      id: String(circle._id),
      name,
      description: description ?? '',
      channelCount: channel ? 1 : 0,
      createdAt: circle.createdAt,
    },
    channel: channel ? serializeChannel(channel.toObject()) : null,
  })
})

export const listChannels = asyncHandler(async (req: Request, res: Response) => {
  const channels = await Channel.find({ circleId: req.params.id }).sort({ createdAt: 1 }).lean()
  res.json({ channels: channels.map(serializeChannel) })
})

export const createChannel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const { name } = parseBody(req, createChannelSchema)
  const circle = await Circle.findById(req.params.id)
  if (!circle) throw new ApiError(404, 'Circle not found')

  const channel = await Channel.create({ name, circleId: circle._id })
  res.status(201).json({ channel: serializeChannel(channel.toObject()) })
})

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const messages = await Message.find({ channelId: req.params.id }).sort({ createdAt: 1 }).limit(200).lean()
  res.json({ messages: messages.map(serializeMessage) })
})

export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const { content } = parseBody(req, createMessageSchema)
  const channel = await Channel.findById(req.params.id)
  if (!channel) throw new ApiError(404, 'Channel not found')

  const user = await User.findById(req.user.id).lean()
  if (!user) throw new ApiError(404, 'User not found')

  const message = await Message.create({
    content,
    channelId: channel._id,
    userId: req.user.id,
    authorName: user.name,
  })

  res.status(201).json({ message: serializeMessage(message.toObject()) })
})
