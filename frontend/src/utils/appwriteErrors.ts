import type { AppwriteException } from 'appwrite'

export function mapAppwriteError(err: unknown): string {
  const code = (err as AppwriteException)?.code
  switch (code) {
    case 401:
      return 'Invalid email or password. Please try again.'
    case 409:
      return 'An account with this email already exists.'
    case 429:
      return 'Too many attempts. Please wait a moment and try again.'
    default:
      if (err instanceof Error && err.message) {
        return err.message
      }
      return 'Something went wrong. Please try again.'
  }
}
