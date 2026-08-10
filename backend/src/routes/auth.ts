import { Router } from 'express'
import * as authController from '../controllers/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/otp/request', authController.requestOtp)
router.post('/otp/verify', authController.verifyOtp)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.me)

export default router
