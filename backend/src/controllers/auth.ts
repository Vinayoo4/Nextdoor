import { z } from 'zod'
import type { Request, Response } from 'express'
import { User } from '../models/User'
import { Otp } from '../models/Otp'
import { hashPassword, verifyPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializeUser } from '../utils/serializers'
import crypto from 'node:crypto'

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email'),
})

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  name: z.string().optional(),
})

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = parseBody(req, requestOtpSchema)

  // Generate 6 digit OTP
  const devOtp = Math.floor(100000 + Math.random() * 900000).toString()
  const codeHash = await hashPassword(devOtp)

  // Expire in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await Otp.findOneAndUpdate(
    { email },
    { email, codeHash, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  )

  // In a real app we'd send an email here. For MVP, we return it in dev mode.
  res.json({ message: 'OTP sent successfully', devOtp })
})

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, name } = parseBody(req, verifyOtpSchema)

  const otpRecord = await Otp.findOne({ email })
  if (!otpRecord) throw new ApiError(400, 'No OTP requested for this email')

  if (otpRecord.expiresAt < new Date()) {
    await Otp.deleteOne({ email })
    throw new ApiError(400, 'OTP expired')
  }

  const ok = await verifyPassword(otp, otpRecord.codeHash)
  if (!ok) {
    otpRecord.attempts += 1
    await otpRecord.save()
    throw new ApiError(400, 'Invalid OTP')
  }

  // OTP is valid
  await Otp.deleteOne({ email })

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({ email, name: name || email.split('@')[0] })
  }

  const token = signToken({ userId: String(user._id), email: user.email, role: user.role })
  res.json({ token, user: serializeUser(user.toObject()) })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const user = await User.findById(req.user.id).select('-passwordHash').lean()
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ user: serializeUser(user) })
})

export const logout = (_req: Request, res: Response) => {
  res.json({ ok: true })
}
