import { Router } from 'express'
import { getRoute } from '../controllers/navigation'
import { heartbeat, syncPeers } from '../controllers/nearby'
import { optionalAuth } from '../middleware/auth'

const router = Router()

router.get('/route', getRoute)
router.post('/nearby/heartbeat', optionalAuth, heartbeat)
router.post('/nearby/sync', optionalAuth, syncPeers)

export default router
