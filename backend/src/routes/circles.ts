import { Router } from 'express'
import * as circleController from '../controllers/circles'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', circleController.listCircles)
router.post('/', requireAuth, circleController.createCircle)
router.get('/:id/channels', circleController.listChannels)
router.post('/:id/channels', requireAuth, circleController.createChannel)

export default router
