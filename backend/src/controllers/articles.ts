import { z } from 'zod'
import type { Request, Response } from 'express'
import { articleRepository, ArticleStatus } from '../database/repositories/articleRepository'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'

const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  contentMarkdown: z.string().min(10, 'Content is too short'),
  category: z.enum(['history', 'heritage', 'places', 'services', 'businesses', 'events', 'future', 'guides']),
  locality: z.string().optional().or(z.literal('')),
  sourceReference: z.string().optional().or(z.literal('')),
})

export const listArticles = asyncHandler(async (req: Request, res: Response) => {
  const category = req.query.category as string
  const status = (req.query.status as ArticleStatus) || 'published'

  // Only admins can see drafts/pending reviews
  if (status !== 'published' && req.user?.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized to view non-published articles')
  }

  const result = articleRepository.findAll({ limit: 100 }, { status, category })
  res.json({ articles: result.items })
})

export const getArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
  const article = articleRepository.findBySlug(req.params.slug)
  if (!article) throw new ApiError(404, 'Article not found')

  // Check access if article is not published
  if (article.status !== 'published' && req.user?.id !== article.author_id && req.user?.role !== 'admin') {
    throw new ApiError(403, 'Access denied')
  }

  res.json({ article })
})

export const createArticle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'Authentication required')

  const { title, contentMarkdown, category, locality, sourceReference } = parseBody(req, createArticleSchema)
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).slice(2, 6)

  const article = articleRepository.create({
    slug,
    title,
    content_markdown: contentMarkdown,
    category,
    locality: locality || undefined,
    status: req.user!.role === 'admin' ? 'published' : 'pending_review', // Admins publish instantly, users require review
    author_id: userId,
    source_reference: sourceReference || undefined,
  })

  res.status(201).json({ article })
})

export const reviewArticle = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role !== 'admin') throw new ApiError(403, 'Admin access required')

  const { status, adminNote } = parseBody(
    req,
    z.object({
      status: z.enum(['published', 'rejected', 'archived']),
      adminNote: z.string().max(300).optional(),
    })
  )

  const article = articleRepository.findById(req.params.id)
  if (!article) throw new ApiError(404, 'Article not found')

  const updated = articleRepository.update(article.id, {
    status,
    reviewer_id: req.user.id,
    published_at: status === 'published' ? new Date() : undefined,
    last_verified_at: new Date(),
    source_reference: adminNote ? `${article.source_reference || ''} (Admin Note: ${adminNote})` : undefined
  })

  res.json({ article: updated })
})
