import { Schema, model } from 'mongoose'

export interface IUser {
  email: string
  name: string
  role: 'user' | 'owner' | 'admin'
  savedPlaces: import('mongoose').Types.ObjectId[]
  points: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, default: 'User' },
    role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
    savedPlaces: [{ type: Schema.Types.ObjectId, ref: 'Business' }],
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const User = model<IUser>('User', userSchema)


