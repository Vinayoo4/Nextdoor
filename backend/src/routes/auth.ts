import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Prevent OTP spam: max 5 OTP requests per IP every 15 minutes.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again later.' },
})

router.post('/otp/request', otpRequestLimiter, authController.requestOtp)
router.post('/otp/verify', authController.verifyOtp)
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.me)

export default router
