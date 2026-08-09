import { Schema, model } from 'mongoose'

export interface IMessage {
  content: string
  channelId: import('mongoose').Types.ObjectId
  userId: import('mongoose').Types.ObjectId
  authorName: string
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    content: { type: String, required: true, maxlength: 1000, trim: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const Message = model<IMessage>('Message', messageSchema)


