import { z } from 'zod'
import type { Request, Response } from 'express'
import { Waitlist } from '../models/Waitlist'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'

export const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { email } = parseBody(req, z.object({ email: z.string().email('Enter a valid email address') }))
  try {
    await Waitlist.create({ email })
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code?: number }).code === 11000) {
      return res.json({ ok: true, already: true })
    }
    throw err
  }
  res.status(201).json({ ok: true })
})
