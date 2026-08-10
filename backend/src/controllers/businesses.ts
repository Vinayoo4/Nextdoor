import { z } from 'zod'
import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Business, slugify, BUSINESS_CATEGORIES } from '../models/Business'
import { Review } from '../models/Review'
import { Offer } from '../models/Offer'
import { User } from '../models/User'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import {
  serializeBusiness,
  serializeOffer,
  serializeReview,
  serializeUser,
} from '../utils/serializers'

const createBusinessSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  category: z.enum(BUSINESS_CATEGORIES),
  subcategory: z.string().max(40).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  address: z.string().min(3, 'Address is required').max(200),
  phone: z.string().min(7, 'Phone is required').max(20),
  whatsapp: z.string().max(20).optional().or(z.literal('')),
  photos: z.array(z.string().url()).max(6).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tags: z.array(z.string().max(20)).max(12).optional(),
  attributes: z
    .object({
      parking: z.boolean().optional(),
      cards: z.boolean().optional(),
      homeDelivery: z.boolean().optional(),
    })
    .optional(),
  hours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1, 'Review text is required').max(1000),
})

const listBusinessesSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().max(100).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  verified: z.enum(['true', 'false']).optional(),
  openNow: z.enum(['true', 'false']).optional(),
  owner: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
})

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function isOpenNow(hours: Record<string, { open: string; close: string }> | undefined): boolean {
  if (!hours) return true
  const now = new Date()
  const day = DAYS[now.getDay()]
  const slot = hours[day]
  if (!slot || !slot.open || !slot.close) return true
  const [oh, om] = slot.open.split(':').map(Number)
  const [ch, cm] = slot.close.split(':').map(Number)
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return true
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm
}

export const listBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radius, category, q, verified, openNow, owner, page, limit } = listBusinessesSchema.parse(req.query)
  const pageNum = Math.max(page ?? 1, 1)
  const pageSize = Math.min(Math.max(limit ?? 20, 1), 50)

  const filter: Record<string, unknown> = { status: 'active' }
  if (category && category !== 'All') filter.category = category
  if (verified === 'true') filter.verified = true
  if (owner === 'me' && req.user) filter.ownerId = new mongoose.Types.ObjectId(req.user.id)
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    }
  }
  if (q && q.trim()) {
    const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: re }, { category: re }, { tags: re }, { subcategory: re }]
  }

  const [docs, total] = await Promise.all([
    Business.find(filter)
      .sort({ plan: -1, _id: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Business.countDocuments(filter),
  ])

  let items = docs.map(serializeBusiness)
  if (openNow === 'true') items = items.filter((b) => isOpenNow(b.hours as never))

  res.json({ businesses: items, page: pageNum, pages: Math.ceil(total / pageSize), total })
})

export const createBusiness = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const data = parseBody(req, createBusinessSchema)
  const baseSlug = slugify(data.name)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

  const business = await Business.create({
    name: data.name,
    slug,
    category: data.category,
    subcategory: data.subcategory || undefined,
    description: data.description || undefined,
    address: data.address,
    phone: data.phone,
    whatsapp: data.whatsapp || undefined,
    photos: data.photos ?? [],
    tags: data.tags ?? [],
    attributes: {
      parking: data.attributes?.parking ?? false,
      cards: data.attributes?.cards ?? false,
      homeDelivery: data.attributes?.homeDelivery ?? false,
    },
    hours: data.hours ?? {},
    location: { type: 'Point', coordinates: [data.lng, data.lat] },
    ownerId: userId,
  })

  res.status(201).json({ business: serializeBusiness(business.toObject()) })
})

export const getBusinessBySlug = asyncHandler(async (req: Request, res: Response) => {
  const business = await Business.findOne({ slug: req.params.slug }).lean()
  if (!business) throw new ApiError(404, 'Business not found')

  const [reviews, offers] = await Promise.all([
    Review.find({ businessId: business._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Offer.find({ businessId: business._id, status: 'active', validTo: { $gte: new Date() } })
      .sort({ validTo: 1 })
      .lean(),
  ])

  res.json({
    business: serializeBusiness(business),
    reviews: reviews.map(serializeReview),
    offers: offers.map(serializeOffer),
  })
})

export const updateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const business = await Business.findById(req.params.id)
  if (!business) throw new ApiError(404, 'Business not found')
  if (String(business.ownerId) !== userId && req.user?.role !== 'admin') {
    throw new ApiError(403, 'Only the owner or an admin can edit this business')
  }
  const { name, description, phone, whatsapp, photos, attributes, hours } = parseBody(
    req,
    z.object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).optional(),
      phone: z.string().min(7).max(20).optional(),
      whatsapp: z.string().max(20).optional(),
      photos: z.array(z.string().url()).max(6).optional(),
      attributes: z.object({ parking: z.boolean().optional(), cards: z.boolean().optional(), homeDelivery: z.boolean().optional() }).optional(),
      hours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
    })
  )
  if (name) business.name = name
  if (description !== undefined) business.description = description || undefined
  if (phone) business.phone = phone
  if (whatsapp !== undefined) business.whatsapp = whatsapp || undefined
  if (photos) business.photos = photos
  if (attributes) business.attributes = { ...business.attributes, ...attributes }
  if (hours) business.hours = hours
  await business.save()
  res.json({ business: serializeBusiness(business.toObject()) })
})

export const claimBusiness = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const business = await Business.findById(req.params.id)
  if (!business) throw new ApiError(404, 'Business not found')
  if (business.ownerId) throw new ApiError(409, 'This business is already claimed')
  business.ownerId = new mongoose.Types.ObjectId(userId)
  await business.save()

  const user = req.user ? await User.findById(userId) : null
  if (user && user.role === 'user') {
    user.role = 'owner'
    await user.save()
  }

  res.json({ business: serializeBusiness(business.toObject()) })
})

export const addReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000' // mock user for testing without auth
  const { rating, text } = parseBody(req, reviewSchema)
  const business = await Business.findById(req.params.id)
  if (!business) throw new ApiError(404, 'Business not found')

  const existing = req.user ? await Review.findOne({ businessId: business._id, userId }) : null
  if (existing) throw new ApiError(409, 'You have already reviewed this business')

  const review = await Review.create({ businessId: business._id, userId, rating, text })

  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { businessId: business._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  business.ratingAvg = agg ? Math.round(agg.avg * 10) / 10 : rating
  business.ratingCount = agg ? agg.count : 1
  await business.save()

  const user = req.user ? await User.findById(userId) : null
  if (user) {
    user.points += 5
    await user.save()
  }

  res.status(201).json({ review: serializeReview(review.toObject()) })
})

export const toggleSave = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const business = await Business.findById(req.params.id)
  if (!business) throw new ApiError(404, 'Business not found')
  const user = req.user ? await User.findById(userId) : null
  if (!user) return res.json({ saved: false, points: 0 })

  const idx = user.savedPlaces.findIndex((p: import('mongoose').Types.ObjectId) => String(p) === req.params.id)
  let saved: boolean
  if (idx >= 0) {
    user.savedPlaces.splice(idx, 1)
    saved = false
  } else {
    user.savedPlaces.push(business._id)
    saved = true
    user.points += 2
  }
  await user.save()

  res.json({ saved, points: user.points })
})

export const listSaved = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const user = req.user ? await User.findById(userId) : null
  if (!user) return res.json({ businesses: [] })
  const saved = await Business.find({ _id: { $in: user.savedPlaces } }).sort({ _id: -1 }).lean()
  res.json({ businesses: saved.map(serializeBusiness) })
})

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const user = req.user ? await User.findById(userId).lean() : null
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ user: serializeUser(user as any) })
})

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id || '000000000000000000000000'
  const { name, email } = parseBody(
    req,
    z.object({
      name: z.string().min(1).max(60).optional(),
      email: z.string().email().optional().or(z.literal('')),
    })
  )
  const user = req.user ? await User.findById(userId) : null
  if (!user) throw new ApiError(404, 'User not found')
  if (name) user.name = name
  if (email !== undefined) user.email = email || (user as any).email
  await user.save()
  res.json({ user: serializeUser(user.toObject()) })
})

