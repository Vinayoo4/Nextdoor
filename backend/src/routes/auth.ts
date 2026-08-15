import { Router } from 'express'
import * as authController from '../controllers/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/clerk-sync', authController.clerkSync)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.me)

export default router
