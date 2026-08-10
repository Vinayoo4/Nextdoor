import { Router } from 'express'
import authRoutes from './auth'
import postRoutes from './posts'
import businessRoutes from './businesses'
import circleRoutes from './circles'
import messageRoutes from './messages'
import buildingRoutes from './buildings'
import emergencyRoutes from './emergency'
import analyticsRoutes from './analytics'
import waitlistRoutes from './waitlist'
import userRoutes from './users'
import navigationRoutes from './navigation'

const router = Router()

router.use('/auth', authRoutes)
router.use('/', navigationRoutes)
router.use('/posts', postRoutes)
router.use('/businesses', businessRoutes)
router.use('/circles', circleRoutes)
router.use('/channels', messageRoutes)
router.use('/buildings', buildingRoutes)
router.use('/emergency', emergencyRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/waitlist', waitlistRoutes)
router.use('/users', userRoutes)

export default router
