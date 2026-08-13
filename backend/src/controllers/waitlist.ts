import { z } from 'zod'
import type { Request, Response } from 'express'
import { waitlistRepository } from '../database/repositories/waitlistRepository'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'

export const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { email } = parseBody(req, z.object({ email: z.string().email('Enter a valid email address') }))
  
  const existing = waitlistRepository.findByEmail(email)
  if (existing) {
    return res.json({ ok: true, already: true })
  }

  try {
    waitlistRepository.create(email)
  } catch (err) {
    // If double checked race condition/unique key failure
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return res.json({ ok: true, already: true })
    }
    throw err
  }
  
  res.status(201).json({ ok: true })
})
