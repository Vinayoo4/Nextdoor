import { Router } from 'express'
import * as pasteController from '../controllers/pastes'
import { requireAuth, optionalAuth } from '../middleware/auth'

const router = Router()

// Public list & detail (using optionalAuth so if a token is present, we know who is loading)
router.get('/', pasteController.listPublicPastes)
router.get('/mine', requireAuth, pasteController.listMyPastes)
router.get('/user/:username', optionalAuth, pasteController.listUserPastes)
router.get('/:id', optionalAuth, pasteController.getPaste)
router.get('/:id/raw', optionalAuth, pasteController.getPasteRaw)

// Creation & edits
router.post('/', requireAuth, pasteController.createPaste)
router.patch('/:id', requireAuth, pasteController.updatePaste)
router.delete('/:id', requireAuth, pasteController.deletePaste)

// Interaction
router.post('/:id/report', optionalAuth, pasteController.reportPaste)
router.get('/:id/comments', optionalAuth, pasteController.listComments)
router.post('/:id/comments', requireAuth, pasteController.addComment)

export default router
