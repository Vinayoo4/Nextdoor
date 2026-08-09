import type { Request } from 'express'
import type { ZodSchema } from 'zod'
import { ApiError } from './errors'

export function parseBody<T>(req: Request, schema: ZodSchema<T>): T {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const first = result.error.errors[0]
    throw new ApiError(400, first?.message ?? 'Invalid request body')
  }
  return result.data
}

export function parseQuery<T>(req: Request, schema: ZodSchema<T>): T {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    const first = result.error.errors[0]
    throw new ApiError(400, first?.message ?? 'Invalid query parameters')
  }
  return result.data
}
