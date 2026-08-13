import { z } from 'zod'
import type { Request, Response } from 'express'
import { analyticsRepository, AnalyticsType } from '../database/repositories/analyticsRepository'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'

const analyticsSchema = z.object({
  type: z.enum(['impression', 'click', 'call', 'navigate', 'save', 'report'] as const),
  listingId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
})

export const logEvent = asyncHandler(async (req: Request, res: Response) => {
  const { type, listingId, meta } = parseBody(req, analyticsSchema)
  analyticsRepository.create({
    type: type as AnalyticsType,
    listing_id: listingId || undefined,
    user_id: req.user?.id,
    meta,
  })
  res.status(201).json({ ok: true })
})
