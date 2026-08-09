import { Router } from 'express'
import * as waitlistController from '../controllers/waitlist'

const router = Router()

router.post('/', waitlistController.joinWaitlist)

export default router
