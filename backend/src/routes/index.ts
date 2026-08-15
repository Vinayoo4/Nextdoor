import { Router } from 'express'
import authRoutes from './auth'
import postRoutes from './posts'
import businessRoutes from './businesses'
import circleRoutes from './circles'
import messageRoutes from './messages'
import buildingRoutes from './buildings'
import emergencyRoutes from './emergency'
import analyticsRoutes from './analytics'
import userRoutes from './users'
import navigationRoutes from './navigation'
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
router.use('/users', userRoutes)
router.use('/admin', adminRoutes)
router.use('/articles', articleRoutes)

export default router
