import type { NextFunction, Request, Response } from 'express'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | void

export function asyncHandler(fn: AsyncHandler): AsyncHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err instanceof Error && err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id format' })
  }
  if (err instanceof Error && err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err instanceof Error && 'code' in err && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: 'A record with that value already exists' })
  }
  console.error('[error]', err)
  return res.status(500).json({ error: 'Internal server error' })
}
