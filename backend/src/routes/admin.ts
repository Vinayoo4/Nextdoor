import { Router } from 'express'
import * as adminController from '../controllers/admin'
import { listUsers } from '../controllers/users'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

// All admin endpoints require auth + admin role
router.use(requireAuth)
router.use(requireAdmin)

router.get('/business-claims', adminController.listClaimRequests)
router.patch('/business-claims/:id', adminController.reviewClaim)
router.get('/verification-log', adminController.getVerificationLog)
router.get('/users', listUsers)
router.get('/audit-logs', adminController.getAuditLogs)

export default router
