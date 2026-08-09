import { Schema, model } from 'mongoose'

export interface IChannel {
  name: string
  circleId: import('mongoose').Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const channelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true, trim: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true, index: true },
  },
  { timestamps: true }
)

export const Channel = model<IChannel>('Channel', channelSchema)


