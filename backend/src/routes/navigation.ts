import { Router } from 'express'
import { getRoute } from '../controllers/navigation'

const router = Router()

router.get('/route', getRoute)

export default router
