import { Schema, model } from 'mongoose'

export interface IWaitlist {
  email: string
  createdAt: Date
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  },
  { timestamps: true }
)

export const Waitlist = model<IWaitlist>('Waitlist', waitlistSchema)


