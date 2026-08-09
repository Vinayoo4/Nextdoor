import { Schema, model } from 'mongoose'

export type BuildingType =
  | 'govt'
  | 'hospital'
  | 'heritage'
  | 'transport'
  | 'emergency'
  | 'banking'
  | 'education'
  | 'worship'

export interface IBuilding {
  name: string
  type: BuildingType
  location?: { type: 'Point'; coordinates: [number, number] }
  address: string
  timings?: string
  contact?: string
  services: string[]
  description?: string
  photos: string[]
  cityId: string
}

const buildingSchema = new Schema<IBuilding>({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['govt', 'hospital', 'heritage', 'transport', 'emergency', 'banking', 'education', 'worship'],
    required: true,
    index: true,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },
  address: { type: String, required: true, trim: true },
  timings: { type: String },
  contact: { type: String },
  services: [{ type: String }],
  description: { type: String, trim: true },
  photos: [{ type: String }],
  cityId: { type: String, default: 'jaipur' },
})

buildingSchema.index({ location: '2dsphere' })

export const Building = model<IBuilding>('Building', buildingSchema)


