import { useAuthStore } from '@/stores/auth'
import { cacheGet, cacheSet, cacheKey } from './offlineCache'
import { APP_CONFIG } from '@/config'
import type { BusinessListResponse, CircleListResponse } from '@/types'

const API_BASE = APP_CONFIG.apiUrl

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  useCache?: boolean
  cacheKeyOverride?: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, useCache = false, cacheKeyOverride } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = useAuthStore.getState().token
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const url = `${API_BASE}${path}`
  const key = cacheKeyOverride ?? cacheKey(method, url, body)

  const doFetch = async () => {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const data = await res.json()
        if (data.error) message = data.error
      } catch {
        // ignore
      }
      if (res.status === 401) useAuthStore.getState().clear()
      throw new ApiError(res.status, message)
    }
    return (await res.json()) as T
  }

  if (useCache) {
    try {
      const data = await doFetch()
      void cacheSet(key, data)
      return data
    } catch {
      const cached = await cacheGet<T>(key)
      if (cached !== undefined) return cached
      throw new Error('You are offline and no cached data is available.')
    }
  }

  return doFetch()
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  del: <T>(path: string, options: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

export const authApi = {
  me: () => api.get<{ user: import('@/types').User }>('/api/auth/me'),
}

export const businessesApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<BusinessListResponse>(`/api/businesses${qs ? `?${qs}` : ''}`, {
      useCache: true,
      cacheKeyOverride: cacheKey('GET', `/api/businesses?${qs}`),
    })
  },
  get: (slug: string) =>
    api.get<{
      business: import('@/types').Business
      offers: import('@/types').Offer[]
      reviews: import('@/types').Review[]
    }>(`/api/businesses/${slug}`, { useCache: true }),
  create: (data: Record<string, unknown>) => api.post<{ business: import('@/types').Business }>('/api/businesses', data),
  toggleSave: (id: string) => api.post<{ saved: boolean; points: number }>(`/api/businesses/${id}/save`),
  addReview: (id: string, data: { rating: number; text: string }) =>
    api.post<{ review: import('@/types').Review }>(`/api/businesses/${id}/reviews`, data),
  claim: (id: string, data: {
    contactName: string
    contactPhone: string
    contactEmail: string
    verificationNote?: string
    evidenceReference?: string
  }) => api.post<{ message: string; request: any }>(`/api/businesses/${id}/claim`, data),
  update: (id: string, data: Record<string, unknown>) => api.patch<{ business: import('@/types').Business }>(`/api/businesses/${id}`, data),
  delete: (id: string) => api.del<{ ok: boolean }>(`/api/businesses/${id}`),
}

export const postsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ posts: import('@/types').Post[] }>(`/api/posts${qs ? `?${qs}` : ''}`, { useCache: true })
  },
  create: (content: string, lat?: number, lng?: number) =>
    api.post<{ post: import('@/types').Post }>('/api/posts', { content, lat, lng }),
  delete: (id: string) => api.del<{ ok: boolean }>(`/api/posts/${id}`),
}

export const circlesApi = {
  list: () => api.get<CircleListResponse>('/api/circles', { useCache: true }),
  create: (data: { name: string; description: string; initialChannel?: string; pin?: string }) =>
    api.post<{ circle: import('@/types').Circle }>('/api/circles', data),
  channels: (circleId: string) => api.get<{ channels: import('@/types').Channel[] }>(`/api/circles/${circleId}/channels`),
  createChannel: (circleId: string, name: string, pin?: string) =>
    api.post<{ channel: import('@/types').Channel }>(`/api/circles/${circleId}/channels`, { name, pin }),
  verifyPin: (circleId: string, pin: string) =>
    api.post<{ ok: boolean; role: string }>(`/api/circles/${circleId}/verify-pin`, { pin }),
  requestAccess: (circleId: string) =>
    api.post<{ ok: boolean; status: string }>(`/api/circles/${circleId}/request-access`),
  listRequests: (circleId: string) =>
    api.get<{ requests: any[] }>(`/api/circles/${circleId}/requests`),
  resolveRequest: (circleId: string, requestId: string, status: 'approved' | 'rejected') =>
    api.post<{ ok: boolean }>(`/api/circles/${circleId}/requests/${requestId}/resolve`, { status }),
  updateRole: (circleId: string, userId: string, role: string) =>
    api.post<{ ok: boolean }>(`/api/circles/${circleId}/members/${userId}/role`, { role }),
  updatePin: (circleId: string, pin: string) =>
    api.put<{ ok: boolean }>(`/api/circles/${circleId}/pin`, { pin }),
  updateCircle: (circleId: string, name: string, description: string) =>
    api.put<{ ok: boolean }>(`/api/circles/${circleId}`, { name, description }),
  getCircle: (circleId: string) =>
    api.get<{ circle: any }>(`/api/circles/${circleId}`),
  listMembers: (circleId: string) =>
    api.get<{ members: any[] }>(`/api/circles/${circleId}/members`),
  verifyChannelPin: (channelId: string, pin: string) =>
    api.post<{ ok: boolean }>(`/api/circles/channels/${channelId}/verify-pin`, { pin }),
  updateChannelPin: (channelId: string, pin: string) =>
    api.put<{ ok: boolean }>(`/api/circles/channels/${channelId}/pin`, { pin }),
  deleteCircle: (circleId: string) =>
    api.del<{ ok: boolean }>(`/api/circles/${circleId}`),
  deleteMessage: (channelId: string, messageId: string) =>
    api.del<{ ok: boolean }>(`/api/circles/channels/${channelId}/messages/${messageId}`),
}

export const messagesApi = {
  list: (channelId: string) => api.get<{ messages: import('@/types').Message[] }>(`/api/channels/${channelId}/messages`),
  send: (channelId: string, content: string, expiresIn?: 'none' | '10m' | '1h' | '1d' | '1w') =>
    api.post<{ message: import('@/types').Message }>(`/api/channels/${channelId}/messages`, { content, expiresIn }),
}

export const emergencyApi = {
  contacts: (lat?: number, lng?: number) =>
    api.get<{ contacts: import('@/types').EmergencyContact[]; nearby: import('@/types').EmergencyContact[] }>(
      `/api/emergency${lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : ''}`,
      { useCache: true }
    ),
}

export const buildingsApi = {
  list: (type?: string) => {
    const query = type ? `?type=${type}` : ''
    return api.get<{ buildings: import('@/types').Building[] }>(`/api/buildings${query}`)
  },
  create: (data: Record<string, unknown>) =>
    api.post<{ building: import('@/types').Building }>('/api/buildings', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<{ building: import('@/types').Building }>(`/api/buildings/${id}`, data),
  delete: (id: string) =>
    api.del<{ ok: boolean }>(`/api/buildings/${id}`),
}

export const waitlistApi = {
  join: (data: { email?: string; phone?: string; city?: string }) =>
    api.post<{ queued: boolean; position: number }>('/api/waitlist', data, { auth: false }),
}

export const navigationApi = {
  getRoute: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    api.get<{
      fallback: boolean
      distanceKm: number
      durationSec?: number
      geometry?: any
      straightLine?: any
    }>(`/api/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`, { useCache: false }),
}

export const nearbyApi = {
  heartbeat: (lat: number, lng: number) =>
    api.post<{ peers: any[] }>('/api/nearby/heartbeat', { lat, lng }),
  sync: (lat: number, lng: number, localPosts: any[], localMessages: any[]) =>
    api.post<{ posts: any[]; ok: boolean }>('/api/nearby/sync', { lat, lng, localPosts, localMessages }),
}

export const pastesApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ pastes: import('@/types').Paste[]; page: number; pages: number; total: number }>(
      `/api/pastes${qs ? `?${qs}` : ''}`
    )
  },
  myPastes: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ pastes: import('@/types').Paste[]; page: number; pages: number; total: number }>(
      `/api/pastes/mine${qs ? `?${qs}` : ''}`
    )
  },
  userPastes: (username: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ pastes: import('@/types').Paste[]; page: number; pages: number; total: number }>(
      `/api/pastes/user/${username}${qs ? `?${qs}` : ''}`
    )
  },
  get: (id: string) => api.get<{ paste: import('@/types').Paste }>(`/api/pastes/${id}`),
  create: (data: {
    title?: string
    content: string
    language?: string
    filename?: string
    visibility?: 'public' | 'unlisted' | 'private' | 'channel'
    expiresIn?: 'none' | '10m' | '1h' | '1d' | '1w'
    channelId?: string
    societyId?: string
  }) => api.post<{ paste: import('@/types').Paste; message?: import('@/types').Message }>('/api/pastes', data),
  update: (id: string, data: Partial<{
    title: string
    content: string
    language: string
    filename: string
    visibility: 'public' | 'unlisted' | 'private' | 'channel'
    expiresIn: 'none' | '10m' | '1h' | '1d' | '1w'
  }>) => api.patch<{ paste: import('@/types').Paste }>(`/api/pastes/${id}`, data),
  delete: (id: string) => api.del<{ ok: boolean }>(`/api/pastes/${id}`),
  report: (id: string, reason: string, description?: string) =>
    api.post<{ ok: boolean }>(`/api/pastes/${id}/report`, { reason, description }),
  comments: (id: string) => api.get<{ comments: import('@/types').PasteComment[] }>(`/api/pastes/${id}/comments`),
  addComment: (id: string, content: string) =>
    api.post<{ comment: import('@/types').PasteComment }>(`/api/pastes/${id}/comments`, { content }),
}

export const adminApi = {
  listClaims: (status?: string) =>
    api.get<{ claims: import('@/types').BusinessClaimRequest[] }>(`/api/admin/business-claims${status ? `?status=${status}` : ''}`),
  reviewClaim: (id: string, status: 'approved' | 'rejected', adminNote?: string) =>
    api.patch<{ ok: boolean }>(`/api/admin/business-claims/${id}`, { status, adminNote }),
  getVerificationLog: () =>
    api.get<{ logs: any[] }>('/api/admin/verification-log'),
  listUsers: () =>
    api.get<{ users: import('@/types').AdminUserEntry[]; total: number }>('/api/admin/users'),
}

export const usersApi = {
  getProfile: (id: string) =>
    api.get<import('@/types').UserProfile>(`/api/users/${id}`),
}

export const articlesApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ articles: import('@/types').Article[] }>(`/api/articles${qs ? `?${qs}` : ''}`)
  },
  get: (slug: string) => api.get<{ article: import('@/types').Article }>(`/api/articles/${slug}`),
  create: (data: {
    title: string
    contentMarkdown: string
    category: 'history' | 'heritage' | 'places' | 'services' | 'businesses' | 'events' | 'future' | 'guides'
    locality?: string
    sourceReference?: string
  }) => api.post<{ article: import('@/types').Article }>('/api/articles', data),
  review: (id: string, status: 'published' | 'rejected' | 'archived', adminNote?: string) =>
    api.patch<{ article: import('@/types').Article }>(`/api/articles/${id}/review`, { status, adminNote }),
}
