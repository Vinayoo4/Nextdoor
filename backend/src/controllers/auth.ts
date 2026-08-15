import { z } from 'zod'
import type { Request, Response } from 'express'
import { createClerkClient, verifyToken } from '@clerk/backend'
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

const clerkSyncSchema = z.object({
  sessionToken: z.string().min(1, 'Clerk session token is required'),
})

export const clerkSync = asyncHandler(async (req: Request, res: Response) => {
  const { sessionToken } = parseBody(req, clerkSyncSchema)

  if (!env.clerkSecretKey) {
    throw new ApiError(500, 'Clerk is not configured on the server (CLERK_SECRET_KEY missing)')
  }

  // Verify the Clerk session JWT server-side. The token is only issued by Clerk
  // after the email verification code has been completed, so a valid token is
  // proof that the user really owns that email address.
  const clerkClient = createClerkClient({ secretKey: env.clerkSecretKey })
  let claims: { sub?: string }
  try {
    claims = await verifyToken(sessionToken, { secretKey: env.clerkSecretKey })
  } catch {
    throw new ApiError(401, 'Invalid or expired Clerk session token')
  }

  if (!claims.sub) {
    throw new ApiError(401, 'Clerk session token missing user id')
  }

  // Resolve the verified Clerk user to get their primary email + full name.
  const clerkUser = await clerkClient.users.getUser(claims.sub)
  const emailNorm = (clerkUser.primaryEmailAddress?.emailAddress ?? '').toLowerCase().trim()
  if (!emailNorm) {
    throw new ApiError(401, 'Clerk user has no verified primary email')
  }

  const firstName = clerkUser.firstName || ''
  const lastName = clerkUser.lastName || ''
  const name = [firstName, lastName].filter(Boolean).join(' ').trim() || emailNorm.split('@')[0]

  let user = userRepository.findByEmail(emailNorm)
  if (!user) {
    user = userRepository.create({
      email: emailNorm,
      name,
      password_hash: '',
    })
  } else if (name && name !== user.name) {
    user = userRepository.update(user.id, { name }) ?? user
  }

  // Generate a standard JWT auth token for the app's local requests
  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  res.json({ token, user: serializeUser(user) })
})
