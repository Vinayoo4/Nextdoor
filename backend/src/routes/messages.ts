import { Router } from 'express'
import * as messageController from '../controllers/circles'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/:id/messages', requireAuth, messageController.listMessages)
router.post('/:id/messages', requireAuth, messageController.createMessage)

export default router
