<template>
  <div class="space-y-6">
    <div class="bg-indigo-600 rounded-xl p-6 text-white shadow-md">
      <h2 class="text-2xl font-bold">Nearby Businesses</h2>
      <p class="text-indigo-100 mt-1">Discover new local favorites</p>
    </div>

    <div class="relative">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search by name or category..."
        class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border pl-10"
      />
      <svg class="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div v-if="loading" class="flex justify-center p-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <p class="text-sm text-red-600 mb-2">Failed to load businesses.</p>
      <button @click="fetchBusinesses" class="text-indigo-600 text-sm font-medium hover:underline">Retry</button>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div v-for="biz in filteredBusinesses" :key="biz.$id" class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div class="p-5">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-gray-900">{{ biz.name }}</h3>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              {{ biz.category }}
            </span>
          </div>
          <p class="text-gray-600 text-sm mt-2">{{ biz.shortDescription }}</p>
          <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span class="text-xs text-gray-500">Local Business</span>
            <button @click="viewDetails(biz.$id)" class="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center">
              View Details
              <svg class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredBusinesses.length === 0" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No businesses listed yet</h3>
        <p class="mt-1 text-sm text-gray-500">{{ searchQuery ? 'No matches for your search.' : 'Check back later for new local spots.' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { databases, APPWRITE_CONFIG, Query } from '../services/appwrite'
import type { Business } from '../types/appwrite'

const router = useRouter()
const businesses = ref<Business[]>([])
const searchQuery = ref('')
const loading = ref(true)
const error = ref(false)

const filteredBusinesses = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return businesses.value
  return businesses.value.filter(
    (b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
  )
})

const fetchBusinesses = async () => {
  loading.value = true
  error.value = false
  try {
    const response = await databases.listDocuments<Business>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.businesses,
      [Query.orderDesc('$createdAt')]
    )
    businesses.value = response.documents
  } catch (err) {
    console.error('Failed to fetch businesses', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const viewDetails = (id: string) => {
  router.push(`/businesses/${id}`)
}

onMounted(() => {
  fetchBusinesses()
})
</script>
