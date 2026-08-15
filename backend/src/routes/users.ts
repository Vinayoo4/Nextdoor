import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getProfile, updateProfile } from '../controllers/businesses'
import { getUserProfile } from '../controllers/users'

const router = Router()

router.use(requireAuth)
router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.get('/:id', getUserProfile)

export default router
