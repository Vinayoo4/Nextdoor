import { Schema, model } from 'mongoose'

export interface IUser {
  phone: string
  name: string
  email?: string
  passwordHash: string
  role: 'user' | 'owner' | 'admin'
  savedPlaces: import('mongoose').Types.ObjectId[]
  points: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
    savedPlaces: [{ type: Schema.Types.ObjectId, ref: 'Business' }],
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const User = model<IUser>('User', userSchema)


