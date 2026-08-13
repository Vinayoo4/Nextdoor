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
import pasteRoutes from './pastes'
import adminRoutes from './admin'
import articleRoutes from './articles'

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
router.use('/pastes', pasteRoutes)
router.use('/admin', adminRoutes)
router.use('/articles', articleRoutes)

export default router
