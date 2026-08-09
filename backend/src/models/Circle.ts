import { Schema, model } from 'mongoose'

export interface ICircle {
  name: string
  description: string
  creatorId: import('mongoose').Types.ObjectId
  memberIds: import('mongoose').Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const circleSchema = new Schema<ICircle>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export const Circle = model<ICircle>('Circle', circleSchema)


