import { Schema, model } from 'mongoose'

export interface IEmergency {
  name: string
  type: 'police' | 'ambulance' | 'fire' | 'women' | 'other'
  phone: string
  address: string
  location?: { type: 'Point'; coordinates: [number, number] }
  city: string
}

const emergencySchema = new Schema<IEmergency>({
  name: { type: String, required: true },
  type: { type: String, enum: ['police', 'ambulance', 'fire', 'women', 'other'], required: true, index: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },
  city: { type: String, default: 'Jaipur' },
})

emergencySchema.index({ location: '2dsphere' })

export const Emergency = model<IEmergency>('Emergency', emergencySchema)


