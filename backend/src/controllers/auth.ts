import { z } from 'zod'
import type { Request, Response } from 'express'
import { userRepository } from '../database/repositories/userRepository'
import { otpRepository } from '../database/repositories/otpRepository'
import { hashPassword, verifyPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializeUser } from '../utils/serializers'
import { sendEmail } from '../utils/email'
import { env } from '../config/env'

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email'),
})

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  name: z.string().optional(),
})

// Simple in-memory cooldown: at most 1 OTP request per email every 60 seconds.
const lastSentAt = new Map<string, number>()

function cooldownRemaining(email: string): number {
  const last = lastSentAt.get(email.toLowerCase())
  if (!last) return 0
  const remaining = Math.ceil((last + 60_000 - Date.now()) / 1000)
  return Math.max(remaining, 0)
}

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = parseBody(req, requestOtpSchema)

  const wait = cooldownRemaining(email)
  if (wait > 0) {
    throw new ApiError(429, `Please wait ${wait} seconds before requesting another OTP`)
  }

  // Generate 6 digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const codeHash = await hashPassword(code)

  // Expire in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  otpRepository.create(email, codeHash, expiresAt)
  lastSentAt.set(email.toLowerCase(), Date.now())

  await sendEmail({
    to: email,
    subject: 'Your Nextdoor Rewari OTP',
    text: `Your OTP is ${code}. It is valid for 10 minutes. If you did not request this, you can safely ignore this email.`,
    html: `<p>Your One-Time Password (OTP) is <strong>${code}</strong>.</p><p>It is valid for 10 minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
  })

  // Never expose the OTP in production.
  if (env.isProduction) {
    res.json({ message: 'OTP sent successfully' })
  } else {
    res.json({ message: 'OTP sent successfully', devOtp: code })
  }
})

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, name } = parseBody(req, verifyOtpSchema)

  const otpRecord = otpRepository.findByEmail(email)
  if (!otpRecord) throw new ApiError(400, 'No OTP requested for this email')

  if (new Date(otpRecord.expires_at) < new Date()) {
    otpRepository.deleteByEmail(email)
    throw new ApiError(400, 'OTP expired')
  }

  const ok = await verifyPassword(otp, otpRecord.code_hash)
  if (!ok) {
    const attempts = otpRepository.incrementAttempts(email)
    if (attempts >= 5) {
      otpRepository.deleteByEmail(email)
      throw new ApiError(400, 'Too many incorrect attempts. Please request a new OTP.')
    }
    throw new ApiError(400, 'Invalid OTP')
  }

  // OTP is valid
  otpRepository.deleteByEmail(email)

  let user = userRepository.findByEmail(email)
  if (!user) {
    user = userRepository.create({ email, name: name || email.split('@')[0], password_hash: '' })
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  res.json({ token, user: serializeUser(user) })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated')
  const user = userRepository.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ user: serializeUser(user) })
})

export const logout = (_req: Request, res: Response) => {
  res.json({ ok: true })
}
