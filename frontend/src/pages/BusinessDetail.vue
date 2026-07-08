<template>
  <div class="space-y-6">
    <div class="flex items-center space-x-2 mb-4">
      <router-link to="/businesses" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
        <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Back to Local
      </router-link>
    </div>

    <div v-if="loading" class="flex justify-center p-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error || !business" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <p class="text-sm text-red-600 mb-2">Business not found or failed to load.</p>
      <button @click="fetchBusiness" class="text-indigo-600 text-sm font-medium hover:underline">Retry</button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      <div class="bg-indigo-600 p-6 text-white">
        <div class="flex justify-between items-start">
          <h2 class="text-2xl font-bold">{{ business.name }}</h2>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-indigo-800 shadow-sm">
            {{ business.category }}
          </span>
        </div>
      </div>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">About</h3>
        <p class="text-gray-700 leading-relaxed">{{ business.shortDescription || 'No description available.' }}</p>

        <div class="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wide">Status</h4>
            <p class="text-sm font-medium text-emerald-600 mt-1">Open Now</p>
          </div>
          <div>
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wide">Location</h4>
            <p class="text-sm font-medium text-gray-800 mt-1">Neighborhood Area</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { databases, APPWRITE_CONFIG } from '../services/appwrite'
import type { BusinessModel } from '../services/models'

const route = useRoute()
const business = ref<BusinessModel | null>(null)
const loading = ref(true)
const error = ref(false)

const fetchBusiness = async () => {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  error.value = false
  try {
    const doc = await databases.getDocument<BusinessModel>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.businesses,
      id
    )
    business.value = doc
  } catch (err) {
    console.error('Failed to fetch business', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBusiness()
})
</script>
