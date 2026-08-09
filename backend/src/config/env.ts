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
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  osmrBaseUrl: process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
  corsOrigin: process.env.CORS_ORIGIN?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? ['http://localhost:5173'],
  seedAdminPhone: process.env.SEED_ADMIN_PHONE ?? '9999999999',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234',
}
