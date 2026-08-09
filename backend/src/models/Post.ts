import { Schema, model } from 'mongoose'

export interface IPost {
  content: string
  userId: import('mongoose').Types.ObjectId
  authorName: string
  authorPhone?: string
  imageUrl?: string
  location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  createdAt: Date
  updatedAt: Date
}

const locationSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
)

const postSchema = new Schema<IPost>(
  {
    content: { type: String, required: true, maxlength: 500, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    authorPhone: { type: String },
    imageUrl: { type: String },
    location: { type: locationSchema },
  },
  { timestamps: true }
)

postSchema.index({ location: '2dsphere' })

export const Post = model<IPost>('Post', postSchema)


