import { Router } from 'express'
import * as circleController from '../controllers/circles'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Circle Core
router.get('/', circleController.listCircles)
router.post('/', requireAuth, circleController.createCircle)
router.get('/:id', requireAuth, circleController.getCircle)

// Access Control & Roles
router.post('/:id/verify-pin', requireAuth, circleController.verifyCirclePin)
router.post('/:id/request-access', requireAuth, circleController.requestCircleAccess)
router.get('/:id/requests', requireAuth, circleController.listCircleRequests)
router.post('/:id/requests/:requestId/resolve', requireAuth, circleController.resolveCircleRequest)
router.post('/:id/members/:userId/role', requireAuth, circleController.updateMemberRole)
router.get('/:id/members', requireAuth, circleController.listCircleMembers)
router.put('/:id/pin', requireAuth, circleController.updateCirclePin)
router.put('/:id', requireAuth, circleController.updateCircle)
router.delete('/:id', requireAuth, circleController.deleteCircle)

// Channel Management
router.get('/:id/channels', requireAuth, circleController.listChannels)
router.post('/:id/channels', requireAuth, circleController.createChannel)
router.post('/channels/:id/verify-pin', requireAuth, circleController.verifyChannelPin)
router.put('/channels/:id/pin', requireAuth, circleController.updateChannelPin)
router.delete('/channels/:channelId/messages/:messageId', requireAuth, circleController.deleteMessage)

export default router
