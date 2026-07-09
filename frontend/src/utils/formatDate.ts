const LOCALE = 'en-IN'

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, { dateStyle: 'medium' })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
