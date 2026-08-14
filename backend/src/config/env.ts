import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and fill it in.`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  databasePath: process.env.DATABASE_PATH ?? './data/app.db',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  osmrBaseUrl: process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
  corsOrigin: process.env.CORS_ORIGIN?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? ['http://localhost:5173'],
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? '',
  emailProvider: process.env.EMAIL_PROVIDER ?? 'console',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Nextdoor Rewari <noreply@example.com>',
}
