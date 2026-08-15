import { Router } from 'express'
import * as buildingController from '../controllers/buildings'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/guide', buildingController.getGuide)
router.get('/', buildingController.listBuildings)

router.post('/', requireAuth, buildingController.createBuilding)
router.put('/:id', requireAuth, buildingController.updateBuilding)
router.delete('/:id', requireAuth, buildingController.deleteBuilding)

export default router
