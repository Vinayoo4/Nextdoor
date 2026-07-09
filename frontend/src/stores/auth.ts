import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ID, type Models } from 'appwrite'
import { account } from '../services/appwrite'
<<<<<<< Updated upstream
import type { Models } from 'appwrite'
=======
import { mapAppwriteError } from '../utils/appwriteErrors'
>>>>>>> Stashed changes

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<Models.User<Models.Preferences> | null>(null)
  const isInitialized = ref(false)

  async function checkAuth() {
    try {
      const session = await account.get()
      user.value = session
      isAuthenticated.value = true
    } catch {
      user.value = null
      isAuthenticated.value = false
    } finally {
      isInitialized.value = true
    }
  }

  async function login(email: string, password: string): Promise<string | null> {
    try {
      try {
        await account.deleteSession('current')
      } catch {
        // No active session
      }
      await account.createEmailPasswordSession(email.trim(), password)
      await checkAuth()
      return null
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function register(email: string, password: string, name: string): Promise<string | null> {
    try {
      try {
        await account.create(ID.unique(), email.trim(), password, name.trim())
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code
        if (code !== 409) {
          return mapAppwriteError(err)
        }
      }
      return login(email, password)
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function requestPasswordRecovery(email: string, redirectUrl: string): Promise<string | null> {
    try {
      await account.createRecovery(email.trim(), redirectUrl)
      return null
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function updateName(name: string): Promise<string | null> {
    try {
      const updated = await account.updateName(name.trim())
      user.value = updated
      return null
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function updatePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    try {
      await account.updatePassword(newPassword, currentPassword)
      return null
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function deleteAccount(): Promise<string | null> {
    try {
      await account.delete()
      isAuthenticated.value = false
      user.value = null
      return null
    } catch (err) {
      return mapAppwriteError(err)
    }
  }

  async function logout() {
    try {
      await account.deleteSession('current')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      isAuthenticated.value = false
      user.value = null
    }
  }

  return {
    isAuthenticated,
    user,
    isInitialized,
    checkAuth,
    login,
    register,
    requestPasswordRecovery,
    updateName,
    updatePassword,
    deleteAccount,
    logout,
  }
})
