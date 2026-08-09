import { z } from 'zod'
import type { Request, Response } from 'express'
import { Building, type BuildingType } from '../models/Building'
import { asyncHandler } from '../utils/errors'
import { serializeBuilding } from '../utils/serializers'

const listBuildingsSchema = z.object({
  type: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().max(100).optional(),
})

const BUILDING_SECTIONS: { key: string; label: string; types: BuildingType[] }[] = [
  { key: 'important', label: 'Important Buildings', types: ['govt', 'banking', 'education'] },
  { key: 'heritage', label: 'Heritage', types: ['heritage', 'worship'] },
  { key: 'emergency', label: 'Emergency', types: ['emergency', 'hospital'] },
  { key: 'transport', label: 'Transport', types: ['transport'] },
]

export const getGuide = asyncHandler(async (_req: Request, res: Response) => {
  const all = await Building.find().sort({ name: 1 }).lean()
  const sections = BUILDING_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    buildings: all.filter((b) => section.types.includes(b.type)).map(serializeBuilding),
  }))
  res.json({ sections })
})

export const listBuildings = asyncHandler(async (req: Request, res: Response) => {
  const { type, lat, lng, radius } = listBuildingsSchema.parse(req.query)

  const filter: Record<string, unknown> = {}
  if (type) filter.type = type
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    }
  }

  const buildings = await Building.find(filter).sort({ name: 1 }).limit(100).lean()
  res.json({ buildings: buildings.map(serializeBuilding) })
})
