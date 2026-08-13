import { Router } from 'express'
import * as adminController from '../controllers/admin'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

// All admin endpoints require auth + admin role
router.use(requireAuth)
router.use(requireAdmin)

router.get('/business-claims', adminController.listClaimRequests)
router.patch('/business-claims/:id', adminController.reviewClaim)
router.get('/verification-log', adminController.getVerificationLog)

export default router
