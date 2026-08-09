import { Router } from 'express'
import * as emergencyController from '../controllers/emergency'

const router = Router()

router.get('/', emergencyController.getEmergency)
router.get('/route', emergencyController.getRoute)
router.get('/landmark', emergencyController.nearestLandmark)

export default router
