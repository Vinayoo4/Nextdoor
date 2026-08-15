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

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).id || 'unknown'
  let status = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_SERVER_ERROR'

  if (err instanceof ApiError) {
    status = err.status
    message = err.message
    code = status === 400 ? 'BAD_REQUEST'
         : status === 401 ? 'UNAUTHORIZED'
         : status === 403 ? 'FORBIDDEN'
         : status === 404 ? 'NOT_FOUND'
         : status === 429 ? 'TOO_MANY_REQUESTS'
         : 'API_ERROR'
  } else if (err.name === 'ValidationError' || err.name === 'CastError') {
    status = 400
    message = err.message || 'Validation error'
    code = 'BAD_REQUEST'
  } else {
    console.error(`[error] [Request ID: ${requestId}]`, err)
  }

  return res.status(status).json({
    error: {
      code,
      message,
      requestId
    }
  })
}
