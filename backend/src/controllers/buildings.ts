import { z } from 'zod'
import type { Request, Response } from 'express'
import { buildingRepository, BuildingType } from '../database/repositories/buildingRepository'
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
  const all = buildingRepository.findGuide('rewari') // default cityId
  const sections = BUILDING_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    buildings: all.filter((b) => section.types.includes(b.type)).map(serializeBuilding),
  }))
  res.json({ sections })
})

export const listBuildings = asyncHandler(async (req: Request, res: Response) => {
  const { type } = listBuildingsSchema.parse(req.query)

  const result = buildingRepository.findAll({ limit: 100 }, { type: type as BuildingType })
  res.json({ buildings: result.items.map(serializeBuilding) })
})
