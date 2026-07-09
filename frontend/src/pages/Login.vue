<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh]">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">Welcome</h2>

      <div v-if="recoverySent" class="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm text-center">
        Password recovery email sent. Check your inbox.
      </div>

      <form v-if="!showRecovery" @submit.prevent="handleSubmit" class="space-y-6">
        <div class="flex items-center justify-center space-x-4 mb-4">
          <button type="button" @click="isRegistering = false" :class="['px-4 py-2 text-sm font-medium rounded-md', !isRegistering ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50']">Login</button>
          <button type="button" @click="isRegistering = true" :class="['px-4 py-2 text-sm font-medium rounded-md', isRegistering ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50']">Register</button>
        </div>

        <div v-if="isRegistering">
          <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
          <input id="name" v-model="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="John Doe" />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
          <input id="email" v-model="email" type="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="you@example.com" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <div class="relative mt-1">
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border pr-10" placeholder="••••••••" />
            <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600" :aria-label="showPassword ? 'Hide password' : 'Show password'">
              <svg v-if="showPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029M6.223 6.223A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" /></svg>
              <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
        </div>

        <button type="submit" :disabled="loading" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50">
          {{ loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login') }}
        </button>

        <p v-if="!isRegistering" class="text-center">
          <button type="button" @click="showRecovery = true" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Forgot Password?</button>
        </p>
        <p v-if="error" class="mt-2 text-center text-sm text-red-600">{{ error }}</p>
      </form>

      <form v-else @submit.prevent="handleRecovery" class="space-y-6">
        <p class="text-sm text-gray-600 text-center">Enter your email and we'll send a recovery link.</p>
        <div>
          <label for="recovery-email" class="block text-sm font-medium text-gray-700">Email Address</label>
          <input id="recovery-email" v-model="email" type="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="you@example.com" />
        </div>
        <button type="submit" :disabled="loading" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
          {{ loading ? 'Sending...' : 'Send Recovery Email' }}
        </button>
        <p v-if="error" class="text-center text-sm text-red-600">{{ error }}</p>
        <p class="text-center">
          <button type="button" @click="showRecovery = false; error = ''; recoverySent = false" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Back to Login</button>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isRegistering = ref(false)
const showRecovery = ref(false)
const showPassword = ref(false)
const recoverySent = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''

  if (!email.value.trim()) {
    error.value = 'Email address is required.'
    return
  }
  if (!password.value || password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (isRegistering.value && !name.value.trim()) {
    error.value = 'Name is required.'
    return
  }

  loading.value = true
  const result = isRegistering.value
    ? await authStore.register(email.value, password.value, name.value)
    : await authStore.login(email.value, password.value)

  loading.value = false

  if (result) {
    error.value = result
    return
  }

  router.push('/')
}

const handleRecovery = async () => {
  error.value = ''
  recoverySent.value = false

  if (!email.value.trim()) {
    error.value = 'Email address is required.'
    return
  }

  loading.value = true
  const redirectUrl = `${window.location.origin}/login`
  const result = await authStore.requestPasswordRecovery(email.value, redirectUrl)
  loading.value = false

  if (result) {
    error.value = result
    return
  }

  recoverySent.value = true
}
</script>
