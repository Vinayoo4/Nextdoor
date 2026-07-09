<template>
  <div class="space-y-6">
    <button @click="router.back()" class="text-indigo-600 flex items-center space-x-1 hover:text-indigo-800 text-sm font-medium">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      <span>Back</span>
    </button>

    <div v-if="loading" class="space-y-4 animate-pulse">
      <div class="bg-white rounded-xl shadow border border-gray-100 p-6">
        <div class="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>

    <div v-else-if="notFound" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Business not found</h3>
      <p class="mt-1 text-sm text-gray-500">This listing may have been removed.</p>
      <router-link to="/businesses" class="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">Back to businesses</router-link>
    </div>

    <div v-else-if="business" class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div class="bg-indigo-600 p-6 text-white">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">{{ business.name }}</h2>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
            {{ business.category }}
          </span>
        </div>
      </div>

      <div class="p-6 space-y-4">
        <img
          v-if="business.imageId"
          :src="getFilePreviewUrl(business.imageId)"
          :alt="business.name"
          class="w-full rounded-xl max-h-64 object-cover"
        />

        <div v-if="!business.imageId" class="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
          <label class="cursor-pointer text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            <input type="file" accept="image/*" class="hidden" @change="onImageUpload" />
            {{ uploadingImage ? 'Uploading photo...' : 'Add business photo' }}
          </label>
          <p v-if="imageError" class="text-xs text-red-600 mt-1">{{ imageError }}</p>
        </div>

        <p class="text-gray-700 leading-relaxed">{{ business.description || business.shortDescription || 'No description available.' }}</p>

        <div v-if="business.phone || business.email" class="pt-4 border-t border-gray-100 space-y-2">
          <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wide">Contact</h3>
          <p v-if="business.phone" class="text-sm text-gray-600">
            <span class="font-medium text-gray-800">Phone:</span> {{ business.phone }}
          </p>
          <p v-if="business.email" class="text-sm text-gray-600">
            <span class="font-medium text-gray-800">Email:</span> {{ business.email }}
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="fetchError" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <p class="text-sm text-red-600 mb-2">Failed to load business details.</p>
      <button @click="fetchBusiness" class="text-indigo-600 text-sm font-medium hover:underline">Retry</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { databases, storage, APPWRITE_CONFIG, ID, getFilePreviewUrl } from '../services/appwrite'
import type { Business } from '../types/appwrite'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const route = useRoute()
const router = useRouter()

const business = ref<Business | null>(null)
const loading = ref(true)
const notFound = ref(false)
const fetchError = ref(false)
const uploadingImage = ref(false)
const imageError = ref('')

const fetchBusiness = async () => {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  notFound.value = false
  fetchError.value = false
  business.value = null

  try {
    const doc = await databases.getDocument<Business>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.businesses,
      id
    )
    business.value = doc
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code === 404) {
      notFound.value = true
    } else {
      fetchError.value = true
      console.error('Failed to fetch business', err)
    }
  } finally {
    loading.value = false
  }
}

const onImageUpload = async (event: Event) => {
  if (!business.value) return
  imageError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Only image files are allowed.'
    input.value = ''
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageError.value = 'Image must be under 5 MB.'
    input.value = ''
    return
  }

  uploadingImage.value = true
  try {
    const uploaded = await storage.createFile(APPWRITE_CONFIG.bucketId, ID.unique(), file)
    const updated = await databases.updateDocument<Business>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.businesses,
      business.value.$id,
      { imageId: uploaded.$id }
    )
    business.value = updated
  } catch (err) {
    console.error('Failed to upload business photo', err)
    imageError.value = 'Failed to upload photo. You may not have permission to update this listing.'
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}

onMounted(fetchBusiness)
watch(() => route.params.id, fetchBusiness)
</script>
