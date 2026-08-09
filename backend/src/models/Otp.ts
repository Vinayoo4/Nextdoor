import { Schema, model } from 'mongoose'

export interface IOtp {
  email: string
  codeHash: string
  expiresAt: Date
  attempts: number
  createdAt: Date
  updatedAt: Date
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// TTL index to automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
otpSchema.index({ email: 1 })

export const Otp = model<IOtp>('Otp', otpSchema)
