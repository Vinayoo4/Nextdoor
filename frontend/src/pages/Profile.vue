<template>
  <div class="space-y-6">
    <div class="bg-indigo-600 rounded-xl p-6 text-white shadow-md">
      <h2 class="text-2xl font-bold">Profile & Settings</h2>
      <p class="text-indigo-100 mt-1">Manage your account</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center space-x-4 mb-6">
        <div class="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 text-xl font-bold">
          {{ authStore.user?.name ? authStore.user.name[0].toUpperCase() : '?' }}
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900">{{ authStore.user?.name || 'Loading...' }}</h3>
          <p class="text-sm text-gray-500">{{ authStore.user?.email || '' }}</p>
        </div>
      </div>

      <div class="space-y-4 border-t border-gray-100 pt-6">
        <div class="flex justify-between items-center">
          <div>
            <h4 class="text-sm font-medium text-gray-900">Account Status</h4>
            <p class="text-xs text-gray-500">Active and verified</p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            Verified
          </span>
        </div>

        <div class="flex justify-between items-center pt-2">
          <div>
            <h4 class="text-sm font-medium text-gray-900">Notifications</h4>
            <p class="text-xs text-gray-500">Manage alerts</p>
          </div>
          <button class="text-indigo-600 text-sm font-medium hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md">Edit</button>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-100">
         <button @click="logout" class="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
