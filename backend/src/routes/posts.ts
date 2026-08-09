import { Router } from 'express'
import * as postController from '../controllers/posts'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', postController.listPosts)
router.post('/', postController.createPost)
router.get('/:id', postController.getPost)
router.delete('/:id', requireAuth, postController.deletePost)
router.get('/:id/comments', postController.listComments)
router.post('/:id/comments', postController.addComment)

export default router
