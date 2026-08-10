import { z } from 'zod'
import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Post } from '../models/Post'
import { Comment } from '../models/Comment'
import { User } from '../models/User'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializeComment, serializePost } from '../utils/serializers'

const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(500, 'Post must be under 500 characters'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
})

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(500, 'Comment must be under 500 characters'),
})

const listPostsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().optional(),
})

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const { cursor, limit, lat, lng, radius } = listPostsSchema.parse(req.query)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)

  const filter: Record<string, unknown> = {}
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    }
  }
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) }
  }

  const docs = await Post.find(filter).sort({ _id: -1 }).limit(pageSize + 1).lean()
  const hasMore = docs.length > pageSize
  const items = docs.slice(0, pageSize)

  res.json({ posts: items.map(serializePost), nextCursor: hasMore ? String(items[items.length - 1]._id) : null })
})

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { content, imageUrl, lat, lng } = parseBody(req, createPostSchema)
  const userId = req.user?.id || '000000000000000000000000'
  const user = req.user ? await User.findById(userId).lean() : null

  const payload: Record<string, unknown> = {
    content,
    userId,
    authorName: user?.name || 'Guest User',
  }
  if (imageUrl) payload.imageUrl = imageUrl
  if (lat !== undefined && lng !== undefined) {
    payload.location = { type: 'Point', coordinates: [lng, lat] }
  }

  const post = await Post.create(payload)

  res.status(201).json({ post: serializePost(post.toObject()) })
})

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id).lean()
  if (!post) throw new ApiError(404, 'Post not found')
  res.json({ post: serializePost(post) })
})

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const post = await Post.findById(req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')
  if (String(post.userId) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own posts')
  }
  await Promise.all([post.deleteOne(), Comment.deleteMany({ postId: post._id })])
  res.json({ ok: true })
})

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 }).limit(100).lean()
  res.json({ comments: comments.map(serializeComment) })
})

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const { content } = parseBody(req, createCommentSchema)
  const post = await Post.findById(req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')

  const user = req.user ? await User.findById(userId).lean() : null

  const comment = await Comment.create({
    content,
    postId: post._id,
    userId,
    authorName: user?.name || 'Guest User',
  })
  res.status(201).json({ comment: serializeComment(comment.toObject()) })
})
