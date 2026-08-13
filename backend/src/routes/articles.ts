import { Router } from 'express'
import * as articleController from '../controllers/articles'
import { requireAuth, optionalAuth } from '../middleware/auth'

const router = Router()

router.get('/', optionalAuth, articleController.listArticles)
router.get('/:slug', optionalAuth, articleController.getArticleBySlug)

router.post('/', requireAuth, articleController.createArticle)
router.patch('/:id/review', requireAuth, articleController.reviewArticle)

export default router
