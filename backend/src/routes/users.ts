import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { changePassword, getProfile, updateProfile } from '../controllers/businesses'

const router = Router()

router.use(requireAuth)
router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.post('/me/password', changePassword)

export default router
