import { z } from 'zod'
import type { Request, Response } from 'express'
import { userRepository } from '../database/repositories/userRepository'
import { transientStore } from '../utils/transientStore'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { generateId } from '../database/repositories/base'
import { requireUserId } from '../middleware/auth'

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
  const { lat, lng, radius } = listPostsSchema.parse(req.query)

  // Use location filtering from in-memory transientStore
  const postsList = transientStore.getPosts(lat, lng, radius ?? 5)

  res.json({
    posts: postsList,
    nextCursor: null
  })
})

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { content, imageUrl, lat, lng } = parseBody(req, createPostSchema)
  const userId = requireUserId(req)
  const user = userRepository.findById(userId)

  // Save to transientStore in-memory cache
  const post = transientStore.addPost({
    id: generateId(),
    content,
    user_id: userId,
    author_name: user?.name || 'Neighbor',
    image_url: imageUrl || null,
    location_lat: lat || null,
    location_lng: lng || null,
  })

  res.status(201).json({ post })
})

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const posts = transientStore.getPosts()
  const post = posts.find((p) => p.id === req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')
  res.json({ post })
})

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req)
  const posts = transientStore.getPosts()
  const post = posts.find((p) => p.id === req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')

  if (post.user_id !== userId && req.user?.role !== 'admin') {
    throw new ApiError(403, 'Only the author or an admin can delete this post')
  }

  transientStore.deletePost(post.id)
  res.json({ ok: true })
})

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = transientStore.getComments(req.params.id)
  res.json({ comments })
})

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req)
  const { content } = parseBody(req, createCommentSchema)

  const posts = transientStore.getPosts()
  const post = posts.find((p) => p.id === req.params.id)
  if (!post) throw new ApiError(404, 'Post not found')

  const user = userRepository.findById(userId)

  const comment = transientStore.addComment(post.id, {
    id: generateId(),
    content,
    post_id: post.id,
    user_id: userId,
    author_name: user?.name || 'Neighbor',
  })

  res.status(201).json({ comment })
})
