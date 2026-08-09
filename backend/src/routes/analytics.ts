import { Router } from 'express'
import * as analyticsController from '../controllers/analytics'

const router = Router()

router.post('/', analyticsController.logEvent)

export default router
