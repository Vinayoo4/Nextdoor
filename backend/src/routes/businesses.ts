import { Router } from 'express'
import * as businessController from '../controllers/businesses'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', businessController.listBusinesses)
router.post('/', requireAuth, businessController.createBusiness)
router.get('/saved', requireAuth, businessController.listSaved)
router.get('/:slug', businessController.getBusinessBySlug)
router.patch('/:id', requireAuth, businessController.updateBusiness)
router.post('/:id/claim', requireAuth, businessController.claimBusiness)
router.post('/:id/reviews', businessController.addReview) // Open for public testing
router.post('/:id/save', requireAuth, businessController.toggleSave)

export default router
