import { z } from 'zod'
import type { Request, Response } from 'express'
import { AnalyticsEvent, type AnalyticsType } from '../models/AnalyticsEvent'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'

const analyticsSchema = z.object({
  type: z.enum(['impression', 'click', 'call', 'navigate', 'save', 'report'] as const),
  listingId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
})

export const logEvent = asyncHandler(async (req: Request, res: Response) => {
  const { type, listingId, meta } = parseBody(req, analyticsSchema)
  await AnalyticsEvent.create({
    type: type as AnalyticsType,
    listingId: listingId || undefined,
    userId: req.user?.id,
    meta,
  })
  res.status(201).json({ ok: true })
})
