import { z } from 'zod'
import type { Request, Response } from 'express'
import { User } from '../models/User'
import { hashPassword, verifyPassword } from '../utils/hash'
import { signToken } from '../utils/jwt'
import { ApiError, asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { serializeUser } from '../utils/serializers'

const registerSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^[0-9+\- ]+$/, 'Phone number can only contain digits'),
  name: z.string().min(1, 'Name is required').max(60),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})

const loginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
})

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { phone, name, email, password } = parseBody(req, registerSchema)
  const existing = await User.findOne({ phone })
  if (existing) throw new ApiError(409, 'An account with this phone already exists')

  const passwordHash = await hashPassword(password)
  const user = await User.create({ phone, name, email: email || undefined, passwordHash })

  const token = signToken({ userId: String(user._id), phone: user.phone, role: user.role })
  res.status(201).json({ token, user: serializeUser(user.toObject()) })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = parseBody(req, loginSchema)
  const user = await User.findOne({ phone })
  if (!user) throw new ApiError(401, 'Invalid phone or password')

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw new ApiError(401, 'Invalid phone or password')

  const token = signToken({ userId: String(user._id), phone: user.phone, role: user.role })
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
