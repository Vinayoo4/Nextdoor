import { Router } from 'express'
import * as buildingController from '../controllers/buildings'

const router = Router()

router.get('/guide', buildingController.getGuide)
router.get('/', buildingController.listBuildings)

export default router
