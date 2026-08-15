import { z } from 'zod'
import type { Request, Response } from 'express'
import { userRepository } from '../database/repositories/userRepository'
import { postRepository } from '../database/repositories/postRepository'
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
  const { lat, lng, radius, limit = 20, cursor } = listPostsSchema.parse(req.query)

  let postsList = transientStore.getPosts(lat, lng, radius ?? 5)

  // Sort posts by created_at descending
  postsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  let startIndex = 0
  if (cursor) {
    const idx = postsList.findIndex(p => p.id === cursor)
    if (idx !== -1) {
      startIndex = idx + 1
    }
  }

  const paginatedPosts = postsList.slice(startIndex, startIndex + limit)
  const nextCursor = paginatedPosts.length === limit ? paginatedPosts[paginatedPosts.length - 1].id : null

  res.json({
    posts: paginatedPosts,
    nextCursor
  })
})

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { content, imageUrl, lat, lng } = parseBody(req, createPostSchema)
  const userId = requireUserId(req)
  const user = userRepository.findById(userId)

  // Save to transientStore in-memory cache
  const postId = generateId()
  const post = transientStore.addPost({
    id: postId,
    content,
    user_id: userId,
    author_name: user?.name || 'Neighbor',
    image_url: imageUrl || null,
    location_lat: lat || null,
    location_lng: lng || null,
  })

  // Persist to SQLite so the timeline history survives restarts.
  try {
    postRepository.create({
      id: postId,
      user_id: userId,
      author_name: user?.name || 'Neighbor',
      content,
      image_url: imageUrl || undefined,
      location_lat: lat || undefined,
      location_lng: lng || undefined,
    })
  } catch (e) {
    console.error('Failed to persist post to DB:', e)
  }

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
  try {
    postRepository.softDelete(post.id)
  } catch (e) {
    console.error('Failed to soft-delete post in DB:', e)
  }
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
