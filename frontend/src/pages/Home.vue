<template>
  <div class="space-y-6">
    <div class="bg-white shadow rounded-xl p-4 border border-gray-100">
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            {{ authStore.user?.name?.[0]?.toUpperCase() ?? 'U' }}
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <textarea
            v-model="newPostContent"
            rows="3"
            maxlength="500"
            class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border resize-none"
            placeholder="What's happening locally?"
          ></textarea>
          <div class="flex justify-between items-center mt-1">
            <span class="text-xs text-gray-400">{{ newPostContent.length }}/500</span>
            <div class="flex items-center space-x-2">
              <label class="cursor-pointer text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                <input type="file" accept="image/*" class="hidden" @change="onImageSelect" />
                {{ uploadingImage ? 'Uploading...' : 'Attach image' }}
              </label>
              <button v-if="selectedImageId" type="button" @click="clearImage" class="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          </div>
          <p v-if="imageError" class="text-xs text-red-600 mt-1">{{ imageError }}</p>
          <img v-if="selectedImagePreview" :src="selectedImagePreview" alt="Preview" class="mt-2 rounded-lg max-h-40 object-cover" />
        </div>
      </div>
      <div class="mt-3 flex items-center justify-end">
        <button
          @click="createPost"
          :disabled="!newPostContent.trim() || creatingPost || uploadingImage"
          :class="['inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white', newPostContent.trim() && !creatingPost ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed']"
        >
          {{ creatingPost ? 'Posting...' : 'Post' }}
        </button>
      </div>
    </div>

    <div v-if="offlineDrafts.length > 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm text-yellow-700">
            You have {{ offlineDrafts.length }} unsynced post draft(s).
          </p>
          <ul class="mt-2 space-y-1">
            <li v-for="draft in offlineDrafts" :key="draft.$id" class="text-xs text-yellow-800 flex items-center justify-between">
              <span>{{ draft.content.slice(0, 40) }}{{ draft.content.length > 40 ? '…' : '' }}</span>
              <span :class="draft.syncStatus === 'failed' ? 'text-red-600' : draft.syncStatus === 'syncing' ? 'text-indigo-600' : 'text-yellow-700'">
                {{ draft.syncStatus }}
              </span>
            </li>
          </ul>
          <button @click="syncDrafts" :disabled="syncing" class="mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-600">
            {{ syncing ? 'Syncing...' : 'Sync Now' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading && posts.length === 0" class="flex justify-center p-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error && posts.length === 0" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <p class="text-sm text-red-600 mb-2">Failed to load posts.</p>
      <button @click="fetchPosts" class="text-indigo-600 text-sm font-medium hover:underline">Retry</button>
    </div>

    <div v-else class="space-y-4">
      <div v-for="post in posts" :key="post.$id" class="bg-white shadow rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex space-x-3">
          <div class="flex-shrink-0">
            <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
              {{ post.authorName ? post.authorName[0].toUpperCase() : 'A' }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-sm font-medium text-gray-900">{{ post.authorName }}</p>
                <p class="text-xs text-gray-500">{{ formatDateTime(post.$createdAt) }}</p>
              </div>
              <button
                v-if="post.userId === authStore.user?.$id"
                @click="deletePost(post.$id)"
                :disabled="deletingPostId === post.$id"
                class="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Delete post"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 text-gray-800 whitespace-pre-wrap">{{ post.content }}</div>
        <img v-if="post.imageId" :src="getFilePreviewUrl(post.imageId)" alt="Post attachment" class="mt-3 rounded-lg max-h-64 object-cover w-full" />

        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center space-x-2 text-gray-500 text-sm mb-2 cursor-pointer hover:text-indigo-600 transition-colors" @click="toggleComments(post.$id)">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span>{{ activeComments[post.$id] ? 'Hide Comments' : 'Show Comments' }}</span>
          </div>

          <div v-if="activeComments[post.$id]">
            <div v-if="commentsLoading[post.$id]" class="text-xs text-gray-400 my-2">Loading comments...</div>
            <div v-else class="space-y-3 mb-3">
              <div v-for="comment in postComments[post.$id] ?? []" :key="comment.$id" class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                <div class="font-medium text-gray-800 mb-1 flex justify-between">
                  <span>{{ comment.authorName }}</span>
                  <span class="text-xs text-gray-400 font-normal">{{ formatDate(comment.$createdAt) }}</span>
                </div>
                <p class="text-gray-600">{{ comment.content }}</p>
              </div>
              <p v-if="!(postComments[post.$id] ?? []).length" class="text-xs text-gray-400 italic">No comments yet.</p>
            </div>

            <div class="flex items-center mt-2 space-x-2">
              <input v-model="newComment[post.$id]" type="text" placeholder="Add a comment..." class="flex-1 rounded-full border-gray-300 bg-gray-50 text-sm px-4 py-2 border focus:ring-indigo-500 focus:border-indigo-500" @keyup.enter="postComment(post.$id)">
              <button @click="postComment(post.$id)" :disabled="!newComment[post.$id]?.trim()" class="bg-indigo-100 text-indigo-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-indigo-200 disabled:opacity-50">Reply</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="posts.length === 0" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No posts</h3>
        <p class="mt-1 text-sm text-gray-500">Be the first to share something in your neighborhood!</p>
      </div>

      <button
        v-if="hasMore"
        @click="loadMore"
        :disabled="loadingMore"
        class="w-full py-3 text-sm font-medium text-indigo-600 bg-white border border-gray-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors"
      >
        {{ loadingMore ? 'Loading...' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { databases, storage, APPWRITE_CONFIG, ID, Query, getFilePreviewUrl } from '../services/appwrite'
import { offlineCache } from '../services/offlineCache'
import type { Post, Comment, PostDraft } from '../types/appwrite'
import { formatDateTime, formatDate } from '../utils/formatDate'

const PAGE_SIZE = 20
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const authStore = useAuthStore()
const posts = ref<Post[]>([])
const newPostContent = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const error = ref(false)
const creatingPost = ref(false)
const deletingPostId = ref<string | null>(null)
const hasMore = ref(false)
const lastCursor = ref<string | null>(null)

const offlineDrafts = ref<PostDraft[]>([])
const syncing = ref(false)

const selectedImageFile = ref<File | null>(null)
const selectedImageId = ref<string | null>(null)
const selectedImagePreview = ref<string | null>(null)
const uploadingImage = ref(false)
const imageError = ref('')

const activeComments = ref<Record<string, boolean>>({})
const postComments = ref<Record<string, Comment[]>>({})
const commentsLoading = ref<Record<string, boolean>>({})
const newComment = ref<Record<string, string>>({})

const buildQueries = (cursor: string | null) => {
  const queries = [Query.orderDesc('$createdAt'), Query.limit(PAGE_SIZE)]
  if (cursor) queries.push(Query.cursorAfter(cursor))
  return queries
}

const fetchPosts = async () => {
  loading.value = true
  error.value = false

  try {
    const response = await databases.listDocuments<Post>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      buildQueries(null)
    )
    posts.value = response.documents
    hasMore.value = response.documents.length === PAGE_SIZE
    lastCursor.value = response.documents.length > 0
      ? response.documents[response.documents.length - 1].$id
      : null

    await offlineCache.cachePosts(posts.value)
    await checkDrafts()
  } catch (err) {
    console.warn('Network fetch failed, loading from local cache', err)
    posts.value = await offlineCache.getCachedPosts() as Post[]
    error.value = true
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!lastCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const response = await databases.listDocuments<Post>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      buildQueries(lastCursor.value)
    )
    posts.value = [...posts.value, ...response.documents]
    hasMore.value = response.documents.length === PAGE_SIZE
    if (response.documents.length > 0) {
      lastCursor.value = response.documents[response.documents.length - 1].$id
    }
  } catch (err) {
    console.error('Failed to load more posts', err)
  } finally {
    loadingMore.value = false
  }
}

const checkDrafts = async () => {
  offlineDrafts.value = await offlineCache.getDrafts()
}

const syncDrafts = async () => {
  if (syncing.value || offlineDrafts.value.length === 0) return
  syncing.value = true
  const drafts = [...offlineDrafts.value]

  for (const draft of drafts) {
    await offlineCache.updateDraftStatus(draft.$id, 'syncing')
    await checkDrafts()
    try {
      const payload: Record<string, string> = {
        content: draft.content,
        userId: draft.userId,
        authorName: draft.authorName.replace(' (Draft)', ''),
      }
      if (draft.imageId) payload.imageId = draft.imageId

      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.posts,
        ID.unique(),
        payload
      )
      await offlineCache.removeDraft(draft.$id)
    } catch (err) {
      console.error('Failed to sync draft', err)
      await offlineCache.updateDraftStatus(draft.$id, 'failed')
    }
  }

  await checkDrafts()
  syncing.value = false
  await fetchPosts()
}

const onImageSelect = async (event: Event) => {
  imageError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Only image files are allowed.'
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageError.value = 'Image must be under 5 MB.'
    return
  }

  selectedImageFile.value = file
  selectedImagePreview.value = URL.createObjectURL(file)
  uploadingImage.value = true

  try {
    const uploaded = await storage.createFile(
      APPWRITE_CONFIG.bucketId,
      ID.unique(),
      file
    )
    selectedImageId.value = uploaded.$id
  } catch (err) {
    console.error('Image upload failed', err)
    imageError.value = 'Failed to upload image. Try again.'
    clearImage()
  } finally {
    uploadingImage.value = false
  }
}

const clearImage = () => {
  if (selectedImagePreview.value) URL.revokeObjectURL(selectedImagePreview.value)
  selectedImageFile.value = null
  selectedImageId.value = null
  selectedImagePreview.value = null
  imageError.value = ''
}

const createPost = async () => {
  const content = newPostContent.value.trim()
  if (!content) return

  const userId = authStore.user?.$id
  const authorName = authStore.user?.name
  if (!userId || !authorName) return

  creatingPost.value = true

  try {
    const payload: Record<string, string> = { content, userId, authorName }
    if (selectedImageId.value) payload.imageId = selectedImageId.value

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      ID.unique(),
      payload
    )
    newPostContent.value = ''
    clearImage()
    await fetchPosts()
    await syncDrafts()
  } catch (err) {
    console.warn('Network down, saving as draft offline', err)
    const draft: PostDraft = {
      $id: `draft-${Date.now()}`,
      content: newPostContent.value,
      $createdAt: new Date().toISOString(),
      userId,
      authorName: authorName + ' (Draft)',
      imageId: selectedImageId.value ?? undefined,
      syncStatus: 'pending',
    }
    await offlineCache.saveDraft(draft)
    posts.value.unshift(draft as unknown as Post)
    newPostContent.value = ''
    clearImage()
    await checkDrafts()
  } finally {
    creatingPost.value = false
  }
}

const deletePost = async (postId: string) => {
  deletingPostId.value = postId
  try {
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      postId
    )
    posts.value = posts.value.filter((p) => p.$id !== postId)
  } catch (err) {
    console.error('Failed to delete post', err)
  } finally {
    deletingPostId.value = null
  }
}

const fetchComments = async (postId: string) => {
  commentsLoading.value[postId] = true
  try {
    const response = await databases.listDocuments<Comment>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.comments,
      [Query.equal('postId', postId), Query.orderAsc('$createdAt')]
    )
    postComments.value[postId] = response.documents
  } catch (err) {
    console.error('Failed to fetch comments', err)
  } finally {
    commentsLoading.value[postId] = false
  }
}

const toggleComments = async (postId: string) => {
  activeComments.value[postId] = !activeComments.value[postId]
  if (activeComments.value[postId] && !postComments.value[postId]) {
    await fetchComments(postId)
  }
}

const postComment = async (postId: string) => {
  const content = newComment.value[postId]?.trim()
  if (!content) return

  const userId = authStore.user?.$id
  const authorName = authStore.user?.name
  if (!userId || !authorName) return

  try {
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.comments,
      ID.unique(),
      { content, postId, userId, authorName }
    )
    newComment.value[postId] = ''
    await fetchComments(postId)
  } catch (err) {
    console.error('Failed to post comment', err)
  }
}

onMounted(async () => {
  await checkDrafts()
  await fetchPosts()
})
</script>
