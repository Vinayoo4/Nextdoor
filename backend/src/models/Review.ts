import { Schema, model } from 'mongoose'

export interface IReview {
  businessId: import('mongoose').Types.ObjectId
  userId: import('mongoose').Types.ObjectId
  rating: number
  text: string
  ownerReply?: string
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    ownerReply: { type: String, trim: true },
  },
  { timestamps: true }
)

export const Review = model<IReview>('Review', reviewSchema)


