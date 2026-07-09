<template>
  <div class="space-y-6">
    <div class="bg-indigo-600 rounded-xl p-6 text-white shadow-md">
      <h2 class="text-2xl font-bold">Your Profile</h2>
      <p class="text-indigo-100 mt-1">Manage your account settings</p>
    </div>

    <div class="bg-white shadow rounded-xl p-5 border border-gray-100 space-y-4">
      <div>
        <p class="text-xs text-gray-500 uppercase tracking-wide">Email</p>
        <p class="text-gray-900 font-medium">{{ authStore.user?.email ?? '—' }}</p>
      </div>

      <div>
        <label for="display-name" class="block text-sm font-medium text-gray-700">Display Name</label>
        <div class="mt-1 flex space-x-2">
          <input id="display-name" v-model="displayName" type="text" class="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" />
          <button @click="saveName" :disabled="nameLoading" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ nameLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>
        <p v-if="nameMessage" :class="nameError ? 'text-red-600' : 'text-green-600'" class="text-sm mt-1">{{ nameMessage }}</p>
      </div>
    </div>

    <div class="bg-white shadow rounded-xl p-5 border border-gray-100 space-y-4">
      <h3 class="text-lg font-bold text-gray-900">Change Password</h3>
      <div>
        <label for="current-password" class="block text-sm font-medium text-gray-700">Current Password</label>
        <input id="current-password" v-model="currentPassword" type="password" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" />
      </div>
      <div>
        <label for="new-password" class="block text-sm font-medium text-gray-700">New Password</label>
        <input id="new-password" v-model="newPassword" type="password" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" />
      </div>
      <button @click="savePassword" :disabled="passwordLoading" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {{ passwordLoading ? 'Updating...' : 'Update Password' }}
      </button>
      <p v-if="passwordMessage" :class="passwordError ? 'text-red-600' : 'text-green-600'" class="text-sm">{{ passwordMessage }}</p>
    </div>

    <div class="bg-white shadow rounded-xl p-5 border border-red-200 space-y-4">
      <h3 class="text-lg font-bold text-red-700">Danger Zone</h3>
      <p class="text-sm text-gray-600">Permanently delete your account and all associated data. This cannot be undone.</p>
      <div>
        <label for="delete-confirm" class="block text-sm font-medium text-gray-700">Type DELETE to confirm</label>
        <input id="delete-confirm" v-model="deleteConfirm" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border" placeholder="DELETE" />
      </div>
      <button @click="handleDeleteAccount" :disabled="deleteLoading || deleteConfirm !== 'DELETE'" class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
        {{ deleteLoading ? 'Deleting...' : 'Delete Account' }}
      </button>
      <p v-if="deleteMessage" :class="deleteError ? 'text-red-600' : 'text-green-600'" class="text-sm">{{ deleteMessage }}</p>
    </div>

    <button @click="handleLogout" class="w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
      Log Out
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const displayName = ref(authStore.user?.name ?? '')
const currentPassword = ref('')
const newPassword = ref('')
const deleteConfirm = ref('')

const nameLoading = ref(false)
const passwordLoading = ref(false)
const deleteLoading = ref(false)

const nameMessage = ref('')
const nameError = ref(false)
const passwordMessage = ref('')
const passwordError = ref(false)
const deleteMessage = ref('')
const deleteError = ref(false)

watch(() => authStore.user?.name, (val) => {
  if (val) displayName.value = val
})

const saveName = async () => {
  nameMessage.value = ''
  nameError.value = false
  if (!displayName.value.trim()) {
    nameMessage.value = 'Name cannot be empty.'
    nameError.value = true
    return
  }
  nameLoading.value = true
  const result = await authStore.updateName(displayName.value)
  nameLoading.value = false
  if (result) {
    nameMessage.value = result
    nameError.value = true
  } else {
    nameMessage.value = 'Name updated successfully.'
  }
}

const savePassword = async () => {
  passwordMessage.value = ''
  passwordError.value = false
  if (!currentPassword.value || !newPassword.value) {
    passwordMessage.value = 'Both current and new passwords are required.'
    passwordError.value = true
    return
  }
  if (newPassword.value.length < 8) {
    passwordMessage.value = 'New password must be at least 8 characters.'
    passwordError.value = true
    return
  }
  passwordLoading.value = true
  const result = await authStore.updatePassword(currentPassword.value, newPassword.value)
  passwordLoading.value = false
  if (result) {
    passwordMessage.value = result
    passwordError.value = true
  } else {
    passwordMessage.value = 'Password updated successfully.'
    currentPassword.value = ''
    newPassword.value = ''
  }
}

const handleDeleteAccount = async () => {
  deleteMessage.value = ''
  deleteError.value = false
  if (deleteConfirm.value !== 'DELETE') return

  deleteLoading.value = true
  const result = await authStore.deleteAccount()
  deleteLoading.value = false

  if (result) {
    deleteMessage.value = result
    deleteError.value = true
  } else {
    router.push('/login')
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
