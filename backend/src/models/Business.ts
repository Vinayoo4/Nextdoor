import { Schema, model } from 'mongoose'

export const BUSINESS_CATEGORIES = [
  'Food',
  'Healthcare',
  'Govt',
  'Banking',
  'Education',
  'Worship',
  'Transport',
  'Shopping',
  'Services',
  'Emergency',
] as const

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]

export interface IHours {
  open: string
  close: string
}

export interface IBusiness {
  name: string
  slug: string
  category: BusinessCategory
  subcategory?: string
  tags: string[]
  location: { type: 'Point'; coordinates: [number, number] }
  address: string
  phone: string
  whatsapp?: string
  hours: Record<string, IHours>
  photos: string[]
  attributes: { parking: boolean; cards: boolean; homeDelivery: boolean }
  ownerId?: import('mongoose').Types.ObjectId
  verified: boolean
  plan: 'free' | 'promoted'
  ratingAvg: number
  ratingCount: number
  status: 'active' | 'pending' | 'suspended'
  description?: string
  createdAt: Date
  updatedAt: Date
}

const businessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: String, required: true, enum: BUSINESS_CATEGORIES },
    subcategory: { type: String },
    tags: [{ type: String }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    hours: { type: Schema.Types.Mixed, default: {} },
    photos: [{ type: String }],
    attributes: {
      parking: { type: Boolean, default: false },
      cards: { type: Boolean, default: false },
      homeDelivery: { type: Boolean, default: false },
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    verified: { type: Boolean, default: false },
    plan: { type: String, enum: ['free', 'promoted'], default: 'free' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active' },
    description: { type: String, trim: true },
  },
  { timestamps: true }
)

businessSchema.index({ location: '2dsphere' })
businessSchema.index({ name: 'text', tags: 'text' })

export const Business = model<IBusiness>('Business', businessSchema)

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}


