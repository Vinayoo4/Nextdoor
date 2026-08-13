import { z } from 'zod'
import type { Request, Response } from 'express'
import { emergencyRepository } from '../database/repositories/emergencyRepository'
import { buildingRepository } from '../database/repositories/buildingRepository'
import { env } from '../config/env'
import { asyncHandler, ApiError } from '../utils/errors'
import { haversineKm, type LatLng } from '../utils/geo'
import { serializeBuilding, serializeEmergency } from '../utils/serializers'

const STATIC_CONTACTS = [
  { name: 'Police', number: '112', type: 'police' },
  { name: 'Ambulance', number: '108', type: 'ambulance' },
  { name: 'Fire', number: '101', type: 'fire' },
  { name: 'Women Helpline', number: '1091', type: 'women' },
  { name: 'Child Helpline', number: '1098', type: 'other' },
] as const

const emergencyQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
})

export const getEmergency = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = emergencyQuerySchema.parse(req.query)

  let nearby: ReturnType<typeof serializeEmergency>[] = []
  if (lat !== undefined && lng !== undefined) {
    const list = emergencyRepository.findNearby(lat, lng, 15) // 15 km max radius
    nearby = list.slice(0, 5).map(serializeEmergency)
  }

  res.json({ contacts: STATIC_CONTACTS, nearby })
})

const routeSchema = z.object({
  fromLat: z.coerce.number(),
  fromLng: z.coerce.number(),
  toLat: z.coerce.number(),
  toLng: z.coerce.number(),
})

interface OsmStep {
  distance: number
  duration: number
  maneuver?: { instruction?: string }
  name?: string
}

export const getRoute = asyncHandler(async (req: Request, res: Response) => {
  const { fromLat, fromLng, toLat, toLng } = routeSchema.parse(req.query)
  const from: LatLng = { lat: fromLat, lng: fromLng }
  const to: LatLng = { lat: toLat, lng: toLng }

  const url = `${env.osmrBaseUrl}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) throw new Error(`OSRM responded ${response.status}`)
    const data = (await response.json()) as {
      code: string
      routes?: {
        distance: number
        duration: number
        geometry: { type: 'LineString'; coordinates: [number, number][] }
        legs: { steps: OsmStep[] }[]
      }[]
    }
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found')

    const route = data.routes[0]
    res.json({
      fallback: false,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationSec: Math.round(route.duration),
      geometry: route.geometry,
      steps: route.legs.flatMap((leg) =>
        leg.steps
          .filter((s) => s.distance > 0)
          .map((s) => ({
            instruction: s.maneuver?.instruction ?? s.name ?? 'Continue',
            distanceKm: Math.round((s.distance / 1000) * 100) / 100,
            durationSec: Math.round(s.duration),
          }))
      ),
    })
  } catch {
    const distanceKm = Math.round(haversineKm(from, to) * 10) / 10
    res.json({
      fallback: true,
      distanceKm,
      durationSec: Math.round((distanceKm / 40) * 3600),
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
      steps: [
        {
          instruction: 'Continue straight to your destination',
          distanceKm,
          durationSec: Math.round((distanceKm / 40) * 3600),
        },
      ],
    })
  }
})

export const nearestLandmark = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = z
    .object({ lat: z.coerce.number(), lng: z.coerce.number() })
    .parse(req.query)

  const result = buildingRepository.findNearest(lat, lng, 3) // 3 km max radius

  if (!result) {
    return res.json({ landmark: null, distanceM: null })
  }

  res.json({
    landmark: serializeBuilding(result.building),
    distanceM: result.distanceM
  })
})

export { ApiError }
