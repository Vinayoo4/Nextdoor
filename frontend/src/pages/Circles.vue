<template>
  <div class="space-y-6">
    <div class="bg-indigo-600 rounded-xl p-6 text-white shadow-md">
      <h2 class="text-2xl font-bold">Community Circles</h2>
      <p class="text-indigo-100 mt-1">Connect with your circles</p>
    </div>

    <div v-if="loading" class="flex justify-center p-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="error" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
      <p class="text-sm text-red-600 mb-2">Failed to load circles.</p>
      <button @click="fetchCircles" class="text-indigo-600 text-sm font-medium hover:underline">Retry</button>
    </div>

    <div v-else class="space-y-6">
      <div v-if="!selectedCircle" class="grid grid-cols-1 gap-4">
        <h3 class="text-lg font-medium text-gray-900 px-1">Your Circles</h3>
        <div v-for="circle in circles" :key="circle.$id" @click="selectCircle(circle)" class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer p-5 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">{{ circle.name }}</h3>
            <p class="text-sm text-gray-500">{{ circle.description }}</p>
          </div>
          <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div v-if="circles.length === 0" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
          <p class="text-sm text-gray-500">No circles found.</p>
        </div>
      </div>

      <div v-else class="space-y-4">
<<<<<<< Updated upstream
        <button @click="backToCircles" class="text-indigo-600 flex items-center space-x-1 hover:text-indigo-800 text-sm font-medium">
=======
        <button @click="goBackToCircles" class="text-indigo-600 flex items-center space-x-1 hover:text-indigo-800 text-sm font-medium">
>>>>>>> Stashed changes
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          <span>Back to Circles</span>
        </button>

        <h3 class="text-xl font-bold text-gray-900 px-1">{{ selectedCircle.name }} Channels</h3>

        <div v-if="channelsLoading" class="text-xs text-gray-400 my-2">Loading channels...</div>

        <div v-for="channel in channels" :key="channel.$id" class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden p-5">
<<<<<<< Updated upstream
           <div class="flex justify-between items-center cursor-pointer hover:text-indigo-600 transition-colors" @click="toggleChannel(channel.$id)">
             <h4 class="text-md font-bold text-gray-800 flex items-center">
               <span class="text-gray-400 mr-2">#</span> {{ channel.name }}
             </h4>
             <svg class="h-5 w-5 text-gray-400" :class="{'transform rotate-180': activeChannels[channel.$id]}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
           </div>

           <!-- Messages -->
           <div v-if="activeChannels[channel.$id]" class="mt-4 pt-4 border-t border-gray-100">
             <div v-if="messagesLoading[channel.$id]" class="text-xs text-gray-400 my-2">Loading messages...</div>
             <div v-else class="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2" :id="'messages-'+channel.$id">
               <div v-for="msg in channelMessages[channel.$id] || []" :key="msg.$id" class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                 <div class="font-medium text-gray-800 mb-1 flex justify-between">
                   <span>{{ msg.authorName }}</span>
                   <span class="text-xs text-gray-400 font-normal">{{ new Date(msg.$createdAt).toLocaleTimeString() }}</span>
                 </div>
                 <p class="text-gray-600">{{ msg.content }}</p>
               </div>
               <p v-if="!(channelMessages[channel.$id] || []).length" class="text-xs text-gray-400 italic text-center py-2">No messages yet. Say hello!</p>
             </div>

             <div class="flex items-center space-x-2">
               <input v-model="newMessage[channel.$id]" type="text" placeholder="Message..." class="flex-1 rounded-full border-gray-300 bg-gray-50 text-sm px-4 py-2 border focus:ring-indigo-500 focus:border-indigo-500" @keyup.enter="postMessage(channel.$id)">
               <button @click="postMessage(channel.$id)" :disabled="!newMessage[channel.$id] || postingMessage[channel.$id]" class="bg-indigo-600 text-white rounded-full p-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0 transition-opacity">
                 <svg v-if="!postingMessage[channel.$id]" class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                 <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
               </button>
             </div>
           </div>
=======
          <div class="flex justify-between items-center mb-4 cursor-pointer hover:text-indigo-600 transition-colors" @click="toggleChannel(channel.$id)">
            <h4 class="text-md font-bold text-gray-800 flex items-center">
              <span class="text-gray-400 mr-2">#</span> {{ channel.name }}
            </h4>
            <svg class="h-5 w-5 text-gray-400" :class="{'transform rotate-180': activeChannels[channel.$id]}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div v-if="activeChannels[channel.$id]" class="mt-4 pt-4 border-t border-gray-100">
            <div v-if="messagesLoading[channel.$id]" class="text-xs text-gray-400 my-2">Loading messages...</div>
            <div
              :ref="(el) => setMessageContainerRef(channel.$id, el as HTMLElement | null)"
              class="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2"
            >
              <div v-for="msg in channelMessages[channel.$id] ?? []" :key="msg.$id" class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                <div class="font-medium text-gray-800 mb-1 flex justify-between">
                  <span>{{ msg.authorName }}</span>
                  <span class="text-xs text-gray-400 font-normal">{{ formatTime(msg.$createdAt) }}</span>
                </div>
                <p class="text-gray-600">{{ msg.content }}</p>
              </div>
              <p v-if="!(channelMessages[channel.$id] ?? []).length" class="text-xs text-gray-400 italic text-center py-2">No messages yet. Say hello!</p>
            </div>

            <div class="flex items-center space-x-2">
              <input v-model="newMessage[channel.$id]" type="text" placeholder="Message..." class="flex-1 rounded-full border-gray-300 bg-gray-50 text-sm px-4 py-2 border focus:ring-indigo-500 focus:border-indigo-500" @keyup.enter="postMessage(channel.$id)">
              <button @click="postMessage(channel.$id)" :disabled="!newMessage[channel.$id]?.trim()" class="bg-indigo-600 text-white rounded-full p-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">
                <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
>>>>>>> Stashed changes
        </div>

        <div v-if="!channelsLoading && channels.length === 0" class="text-center py-10 bg-white shadow rounded-xl border border-gray-100">
          <p class="text-sm text-gray-500">No channels found for this circle.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
<<<<<<< Updated upstream
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { databases, APPWRITE_CONFIG, ID, Query } from '../services/appwrite'
import type { CircleModel, ChannelModel, MessageModel } from '../services/models'

const authStore = useAuthStore()
const circles = ref<CircleModel[]>([])
const channels = ref<ChannelModel[]>([])
const selectedCircle = ref<CircleModel | null>(null)
=======
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { client, databases, APPWRITE_CONFIG, ID, Query } from '../services/appwrite'
import type { Circle, Channel, Message } from '../types/appwrite'
import { formatTime } from '../utils/formatDate'

const POLL_INTERVAL_MS = 5000

const authStore = useAuthStore()
const circles = ref<Circle[]>([])
const channels = ref<Channel[]>([])
const selectedCircle = ref<Circle | null>(null)
>>>>>>> Stashed changes
const loading = ref(true)
const error = ref(false)
const channelsLoading = ref(false)

const channelCache = new Map<string, Channel[]>()
const activeChannels = ref<Record<string, boolean>>({})
<<<<<<< Updated upstream
const channelMessages = ref<Record<string, MessageModel[]>>({})
const messagesLoading = ref<Record<string, boolean>>({})
const newMessage = ref<Record<string, string>>({})
const postingMessage = ref<Record<string, boolean>>({})

// Polling interval
let pollInterval: any = null
=======
const channelMessages = ref<Record<string, Message[]>>({})
const messagesLoading = ref<Record<string, boolean>>({})
const newMessage = ref<Record<string, string>>({})
const messageContainers = ref<Record<string, HTMLElement | null>>({})

let realtimeUnsubscribe: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let usingRealtime = false
const openChannelId = ref<string | null>(null)

const setMessageContainerRef = (channelId: string, el: HTMLElement | null) => {
  messageContainers.value[channelId] = el
}

const scrollToBottom = async (channelId: string) => {
  await nextTick()
  const container = messageContainers.value[channelId]
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}
>>>>>>> Stashed changes

const fetchCircles = async () => {
  loading.value = true
  error.value = false
  try {
<<<<<<< Updated upstream
    const response = await databases.listDocuments<CircleModel>(
=======
    const response = await databases.listDocuments<Circle>(
>>>>>>> Stashed changes
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.circles
    )
    circles.value = response.documents
  } catch (err) {
    console.error('Failed to fetch circles', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

<<<<<<< Updated upstream
const backToCircles = () => {
  selectedCircle.value = null
  channels.value = []
  activeChannels.value = {}
  channelMessages.value = {}
  stopPolling()
}

const selectCircle = async (circle: CircleModel) => {
=======
const fetchChannelsForCircle = async (circleId: string) => {
  const response = await databases.listDocuments<Channel>(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.channels,
    [Query.equal('circleId', circleId), Query.orderDesc('$createdAt')]
  )
  channelCache.set(circleId, response.documents)
  return response.documents
}

const selectCircle = async (circle: Circle) => {
  teardownSubscriptions()
  channels.value = []
>>>>>>> Stashed changes
  selectedCircle.value = circle
  channelsLoading.value = true

  try {
<<<<<<< Updated upstream
    const response = await databases.listDocuments<ChannelModel>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.channels,
      [Query.equal('circleId', circle.$id)]
    )
    channels.value = response.documents
=======
    if (channelCache.has(circle.$id)) {
      channels.value = channelCache.get(circle.$id) ?? []
    } else {
      channels.value = await fetchChannelsForCircle(circle.$id)
    }
>>>>>>> Stashed changes
  } catch (err) {
    console.error('Failed to fetch channels', err)
  } finally {
    channelsLoading.value = false
  }
}

<<<<<<< Updated upstream
const fetchMessages = async (channelId: string, background = false) => {
  if (!background) messagesLoading.value[channelId] = true
  try {
    const response = await databases.listDocuments<MessageModel>(
=======
const goBackToCircles = () => {
  teardownSubscriptions()
  selectedCircle.value = null
  channels.value = []
  activeChannels.value = {}
}

const fetchMessages = async (channelId: string) => {
  messagesLoading.value[channelId] = true
  try {
    const response = await databases.listDocuments<Message>(
>>>>>>> Stashed changes
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      [Query.equal('channelId', channelId), Query.orderAsc('$createdAt')]
    )
    channelMessages.value[channelId] = response.documents
<<<<<<< Updated upstream

    if (!background) {
      await nextTick()
      const el = document.getElementById('messages-' + channelId)
      if (el) el.scrollTop = el.scrollHeight
    }
=======
    await scrollToBottom(channelId)
>>>>>>> Stashed changes
  } catch (err) {
    console.error('Failed to fetch messages', err)
  } finally {
    if (!background) messagesLoading.value[channelId] = false
  }
}

const appendMessage = (channelId: string, message: Message) => {
  const existing = channelMessages.value[channelId] ?? []
  if (existing.some((m) => m.$id === message.$id)) return
  channelMessages.value[channelId] = [...existing, message]
  scrollToBottom(channelId)
}

const setupRealtime = (channelId: string) => {
  teardownSubscriptions()
  openChannelId.value = channelId

  try {
    const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.collections.messages}.documents`
    realtimeUnsubscribe = client.subscribe(channel, (response) => {
      const isCreate = response.events.some((e) => e.endsWith('.create'))
      if (!isCreate) return
      const payload = response.payload as Message
      if (payload.channelId === channelId) {
        appendMessage(channelId, payload)
      }
    })
    usingRealtime = true
  } catch (err) {
    console.warn('Realtime unavailable, falling back to polling', err)
    usingRealtime = false
    setupPolling(channelId)
  }
}

const setupPolling = (channelId: string) => {
  pollTimer = setInterval(async () => {
    if (openChannelId.value !== channelId) return
    try {
      const response = await databases.listDocuments<Message>(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.messages,
        [Query.equal('channelId', channelId), Query.orderAsc('$createdAt')]
      )
      const prev = channelMessages.value[channelId] ?? []
      if (response.documents.length > prev.length) {
        channelMessages.value[channelId] = response.documents
        scrollToBottom(channelId)
      }
    } catch (err) {
      console.error('Polling fetch failed', err)
    }
  }, POLL_INTERVAL_MS)
}

const teardownSubscriptions = () => {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe()
    realtimeUnsubscribe = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  openChannelId.value = null
  usingRealtime = false
}

const toggleChannel = async (channelId: string) => {
<<<<<<< Updated upstream
  activeChannels.value[channelId] = !activeChannels.value[channelId]
  if (activeChannels.value[channelId]) {
    await fetchMessages(channelId)
    startPolling(channelId)
  } else {
    // Stop polling if we close the channel (in a simplified way we just poll all open channels)
  }
}

const startPolling = (_channelId: string) => {
  if (!pollInterval) {
    pollInterval = setInterval(() => {
      // Poll all active channels
      Object.keys(activeChannels.value).forEach(id => {
        if (activeChannels.value[id]) {
          fetchMessages(id, true)
        }
      })
    }, 5000)
  }
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
=======
  const isOpening = !activeChannels.value[channelId]
  activeChannels.value[channelId] = isOpening

  if (isOpening) {
    if (!channelMessages.value[channelId]) {
      await fetchMessages(channelId)
    }
    setupRealtime(channelId)
  } else {
    teardownSubscriptions()
>>>>>>> Stashed changes
  }
}

const postMessage = async (channelId: string) => {
<<<<<<< Updated upstream
  const content = newMessage.value[channelId]
  if (!content || !authStore.user) return

  postingMessage.value[channelId] = true
=======
  const content = newMessage.value[channelId]?.trim()
  if (!content) return

  const userId = authStore.user?.$id
  const authorName = authStore.user?.name
  if (!userId || !authorName) return

>>>>>>> Stashed changes
  try {
    const created = await databases.createDocument<Message>(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      ID.unique(),
      { content, channelId, userId, authorName }
    )
    newMessage.value[channelId] = ''
<<<<<<< Updated upstream
    await fetchMessages(channelId)
    await nextTick()
    const el = document.getElementById('messages-' + channelId)
    if (el) el.scrollTop = el.scrollHeight
=======
    if (usingRealtime) {
      appendMessage(channelId, created)
    } else {
      await fetchMessages(channelId)
    }
>>>>>>> Stashed changes
  } catch (err) {
    console.error('Failed to post message', err)
  } finally {
    postingMessage.value[channelId] = false
  }
}

onMounted(() => {
  fetchCircles()
})

onUnmounted(() => {
<<<<<<< Updated upstream
  stopPolling()
=======
  teardownSubscriptions()
>>>>>>> Stashed changes
})
</script>
