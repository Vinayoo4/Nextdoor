import { Router } from 'express'
import * as postController from '../controllers/posts'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', postController.listPosts)
router.post('/', requireAuth, postController.createPost)
router.get('/:id', postController.getPost)
router.delete('/:id', requireAuth, postController.deletePost)
router.get('/:id/comments', postController.listComments)
router.post('/:id/comments', requireAuth, postController.addComment)

export default router
