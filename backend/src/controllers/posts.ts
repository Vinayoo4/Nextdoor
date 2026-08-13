import { z } from 'zod'
import type { Request, Response } from 'express'
import { postRepository } from '../database/repositories/postRepository'
import { commentRepository } from '../database/repositories/commentRepository'
import { userRepository } from '../database/repositories/userRepository'
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
  limit: z.coerce.number().min(1).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().optional(),
})

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const { limit, lat, lng, radius } = listPostsSchema.parse(req.query)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)

  let postsList: any[] = []
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    const result = postRepository.findNearby(lat, lng, radius, { limit: pageSize })
    postsList = result.items
  } else {
    const result = postRepository.findAll({ limit: pageSize })
    postsList = result.items
  }

  res.json({
    posts: postsList.map(serializePost),
    nextCursor: null // Keeping it for backward compatibility, though not used in UI
  })
})

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { content, imageUrl, lat, lng } = parseBody(req, createPostSchema)
  const userId = req.user?.id || '000000000000000000000000'
  const user = req.user ? userRepository.findById(userId) : null

  const post = postRepository.create({
    content,
    user_id: userId,
    author_name: user?.name || 'Guest User',
    image_url: imageUrl || undefined,
    location_lat: lat,
    location_lng: lng,
  })

  res.status(201).json({ post: serializePost(post) })
})

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const post = postRepository.findById(req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')
  res.json({ post: serializePost(post) })
})

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const post = postRepository.findById(req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own posts')
  }
  postRepository.softDelete(req.params.id)
  res.json({ ok: true })
})

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const result = commentRepository.findByPostId(req.params.id, { limit: 100 })
  res.json({ comments: result.items.map(serializeComment) })
})

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const { content } = parseBody(req, createCommentSchema)
  const post = postRepository.findById(req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')

  const user = req.user ? userRepository.findById(userId) : null

  const comment = commentRepository.create({
    content,
    post_id: post.id,
    user_id: userId,
    author_name: user?.name || 'Guest User',
  })
  res.status(201).json({ comment: serializeComment(comment) })
})
