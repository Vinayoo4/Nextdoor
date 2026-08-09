import { Schema, model } from 'mongoose'

export interface IOffer {
  businessId: import('mongoose').Types.ObjectId
  title: string
  discount: string
  code?: string
  validFrom: Date
  validTo: Date
  status: 'active' | 'expired'
  createdAt: Date
  updatedAt: Date
}

const offerSchema = new Schema<IOffer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    title: { type: String, required: true, trim: true },
    discount: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
  },
  { timestamps: true }
)

export const Offer = model<IOffer>('Offer', offerSchema)


