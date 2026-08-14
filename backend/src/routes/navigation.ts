import { Router } from 'express'
import { getRoute } from '../controllers/navigation'
import { heartbeat, syncPeers } from '../controllers/nearby'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/route', getRoute)
router.post('/nearby/heartbeat', requireAuth, heartbeat)
router.post('/nearby/sync', requireAuth, syncPeers)

export default router
