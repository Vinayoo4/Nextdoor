<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-16 z-10">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold">
            {{ authStore.user?.name ? authStore.user.name[0].toUpperCase() : '?' }}
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <textarea v-model="newPostContent" rows="3" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none p-3 border" placeholder="What's happening in your neighborhood?" :disabled="creatingPost"></textarea>
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <button @click="createPost" :disabled="!newPostContent || creatingPost" :class="['inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white', newPostContent && !creatingPost ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed']">
          {{ creatingPost ? 'Posting...' : 'Post' }}
        </button>
      </div>
    </div>

    <!-- Drafts Sync -->
    <div v-if="offlineDrafts.length > 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            You have {{ offlineDrafts.length }} unsynced post draft(s).
          </p>
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
      <p class="text-sm text-red-600 mb-2">Failed to load posts. Displaying cached data if available.</p>
      <button @click="() => fetchPosts(true)" class="text-indigo-600 text-sm font-medium hover:underline">Retry Connection</button>
    </div>

    <div v-else class="space-y-4">
      <div v-for="post in posts" :key="post.$id" class="bg-white shadow rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex space-x-3 justify-between">
          <div class="flex space-x-3">
            <div class="flex-shrink-0">
              <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                {{ post.authorName ? post.authorName[0].toUpperCase() : 'A' }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">
                {{ post.authorName }}
              </p>
              <p class="text-xs text-gray-500">
                {{ new Date(post.$createdAt).toLocaleString() }}
              </p>
            </div>
          </div>
          <!-- Delete button for own posts -->
          <div v-if="post.userId === authStore.user?.$id && !post.$id.startsWith('draft-')">
            <button @click="deletePost(post.$id)" class="text-gray-400 hover:text-red-500 transition-colors" title="Delete post">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div class="mt-4 text-gray-800 whitespace-pre-wrap">{{ post.content }}</div>

        <div v-if="!post.$id.startsWith('draft-')" class="mt-4 pt-4 border-t border-gray-100">
           <div class="flex items-center space-x-2 text-gray-500 text-sm mb-2 cursor-pointer hover:text-indigo-600 transition-colors" @click="toggleComments(post.$id)">
             <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
             <span>{{ activeComments[post.$id] ? 'Hide Comments' : 'Show Comments' }}</span>
           </div>

           <div v-if="activeComments[post.$id]">
             <div v-if="commentsLoading[post.$id]" class="text-xs text-gray-400 my-2">Loading...</div>
             <div v-else class="space-y-3 mb-3">
               <div v-for="comment in postComments[post.$id] || []" :key="comment.$id" class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                 <div class="font-medium text-gray-800 mb-1 flex justify-between">
                   <span>{{ comment.authorName }}</span>
                   <span class="text-xs text-gray-400 font-normal">{{ new Date(comment.$createdAt).toLocaleDateString() }}</span>
                 </div>
                 <p class="text-gray-600">{{ comment.content }}</p>
               </div>
               <p v-if="!(postComments[post.$id] || []).length" class="text-xs text-gray-400 italic">No comments yet.</p>
             </div>

             <div class="flex items-center mt-2 space-x-2">
               <input v-model="newComment[post.$id]" type="text" placeholder="Add a comment..." class="flex-1 rounded-full border-gray-300 bg-gray-50 text-sm px-4 py-2 border focus:ring-indigo-500 focus:border-indigo-500" @keyup.enter="postComment(post.$id)">
               <button @click="postComment(post.$id)" :disabled="!newComment[post.$id]" class="bg-indigo-100 text-indigo-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-indigo-200 disabled:opacity-50">Reply</button>
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

      <div v-if="hasMorePosts && !error && posts.length > 0" class="flex justify-center mt-4 pb-4">
        <button @click="() => fetchPosts(false)" :disabled="loading" class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          {{ loading ? 'Loading...' : 'Load More' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { databases, APPWRITE_CONFIG, ID, Query } from '../services/appwrite'
import { offlineCache } from '../services/offlineCache'
import type { PostDraft } from '../services/offlineCache'
import type { PostModel, CommentModel } from '../services/models'

const authStore = useAuthStore()
const posts = ref<any[]>([])
const newPostContent = ref('')
const loading = ref(true)
const error = ref(false)
const creatingPost = ref(false)
const hasMorePosts = ref(true)

const offlineDrafts = ref<PostDraft[]>([])
const syncing = ref(false)

const activeComments = ref<Record<string, boolean>>({})
const postComments = ref<Record<string, CommentModel[]>>({})
const commentsLoading = ref<Record<string, boolean>>({})
const newComment = ref<Record<string, string>>({})

const fetchPosts = async (reset = true) => {
  if (reset) {
    loading.value = true
    posts.value = offlineDrafts.value // Show drafts at top first
  } else {
    loading.value = true
  }

  error.value = false

  try {
    const queries = [Query.orderDesc('$createdAt'), Query.limit(20)]
    // If not reset, we use pagination with cursorAfter
    if (!reset && posts.value.length > 0) {
      // Find the last real post (not draft)
      const realPosts = posts.value.filter(p => !p.$id.startsWith('draft-'))
      if (realPosts.length > 0) {
        queries.push(Query.cursorAfter(realPosts[realPosts.length - 1].$id))
      }
    }

    const response = await databases.listDocuments<PostModel>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      queries
    )

    if (reset) {
      posts.value = [...offlineDrafts.value, ...response.documents]
      await offlineCache.cachePosts(response.documents)
    } else {
      posts.value = [...posts.value, ...response.documents]
    }

    hasMorePosts.value = response.documents.length === 20

    // Auto sync on successful fetch
    await checkDrafts()
    if (offlineDrafts.value.length > 0) {
      syncDrafts() // run in background
    }
  } catch (err) {
    console.warn('Network fetch failed, loading from local cache', err)
    if (reset) {
      const cached = await offlineCache.getCachedPosts()
      posts.value = [...offlineDrafts.value, ...cached]
    }
    error.value = true
  } finally {
    loading.value = false
  }
}

const checkDrafts = async () => {
  const drafts = await offlineCache.getDrafts()
  offlineDrafts.value = drafts
}

const syncDrafts = async () => {
  if (syncing.value || offlineDrafts.value.length === 0) return
  syncing.value = true
  try {
    for (const draft of offlineDrafts.value) {
      if (draft.syncStatus === 'syncing') continue; // Prevent loop

      draft.syncStatus = 'syncing'
      await offlineCache.saveDraft(draft) // update state

      try {
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.posts,
          ID.unique(),
          {
            content: draft.content,
            userId: draft.userId,
            authorName: draft.authorName.replace(' (Draft)', '')
          }
        )
        await offlineCache.removeDraft(draft.$id)
      } catch (e) {
        draft.syncStatus = 'failed'
        await offlineCache.saveDraft(draft)
      }
    }
    await checkDrafts()
    await fetchPosts(true)
  } catch (err) {
    console.error('Failed to sync drafts', err)
  } finally {
    syncing.value = false
  }
}

const createPost = async () => {
  if (!newPostContent.value || !authStore.user) return
  creatingPost.value = true

  try {
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      ID.unique(),
      {
        content: newPostContent.value,
        userId: authStore.user.$id,
        authorName: authStore.user.name
      }
    )
    newPostContent.value = ''
    await fetchPosts(true)
  } catch (err) {
    console.warn('Network down, saving as draft offline', err)
    const draft: PostDraft = {
      $id: `draft-${Date.now()}`,
      content: newPostContent.value,
      $createdAt: new Date().toISOString(),
      userId: authStore.user.$id,
      authorName: authStore.user.name + ' (Draft)',
      syncStatus: 'pending'
    }
    await offlineCache.saveDraft(draft)
    posts.value.unshift(draft)
    newPostContent.value = ''
    await checkDrafts()
  } finally {
    creatingPost.value = false
  }
}

const deletePost = async (postId: string) => {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.posts,
      postId
    )
    posts.value = posts.value.filter(p => p.$id !== postId)
  } catch (err) {
    console.error('Failed to delete post', err)
    alert('Failed to delete post.')
  }
}

const fetchComments = async (postId: string) => {
  commentsLoading.value[postId] = true
  try {
    const response = await databases.listDocuments<CommentModel>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.comments,
      [
        Query.equal('postId', postId),
        Query.orderAsc('$createdAt')
      ]
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
  const content = newComment.value[postId]
  if (!content || !authStore.user) return

  try {
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.comments,
      ID.unique(),
      {
        content,
        postId,
        userId: authStore.user.$id,
        authorName: authStore.user.name
      }
    )
    newComment.value[postId] = ''
    await fetchComments(postId)
  } catch (err) {
    console.error('Failed to post comment', err)
  }
}

onMounted(async () => {
  await checkDrafts()
  await fetchPosts(true)
})
</script>
