import { describe, it, expect, beforeAll } from 'vitest'
import { runMigrations, getDatabase } from '../database/connection'
import { hashPassword, verifyPassword } from '../utils/hash'
import { userRepository } from '../database/repositories/userRepository'
import { generateId } from '../database/repositories/base'

describe('Nextdoor Integration Tests', () => {
  beforeAll(() => {
    // Set up database for testing
    process.env.DATABASE_URL = '' // Enforce SQLite test environment
    runMigrations()
  })

  describe('Authentication Cryptography Helpers', () => {
    it('should correctly hash and verify password hashes using bcryptjs', async () => {
      const password = 'mySecretSecurePassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toEqual(password)
      
      const isMatch = await verifyPassword(password, hash)
      expect(isMatch).toBe(true)

      const isMismatch = await verifyPassword('wrongpassword', hash)
      expect(isMismatch).toBe(false)
    })
  })

  describe('Database Operations', () => {
    it('should support executing migrations and basic DB connectivity checks', () => {
      const db = getDatabase()
      const result = db.prepare('SELECT 1 + 1 AS sum').get() as { sum: number }
      expect(result).toBeDefined()
      expect(result.sum).toBe(2)
    })

    it('should be able to create, find, and query users in SQLite', () => {
      const email = `testuser-${generateId()}@example.com`
      const password = 'hashedPasswordPlaceholder'

      const created = userRepository.create({
        email,
        password_hash: password,
        name: 'Integration Test User',
      })

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.email).toBe(email)

      const user = userRepository.findById(created.id)
      expect(user).toBeDefined()
      expect(user?.id).toBe(created.id)
      expect(user?.email).toBe(email)
      expect(user?.points).toBe(0)

      const missingUser = userRepository.findById('non-existent-user-id')
      expect(missingUser).toBeNull()
    })
  })
})
