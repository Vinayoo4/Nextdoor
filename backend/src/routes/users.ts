import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getProfile, updateProfile } from '../controllers/businesses'

const router = Router()

router.use(requireAuth)
router.get('/me', getProfile)
router.patch('/me', updateProfile)

export default router
