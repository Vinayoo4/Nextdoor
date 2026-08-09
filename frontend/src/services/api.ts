import { useAuthStore } from '@/stores/auth'
import { cacheGet, cacheSet, cacheKey } from './offlineCache'
import type { AuthResponse, BusinessListResponse, CircleListResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

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
  del: <T>(path: string, options: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

export const authApi = {
  register: (data: { name: string; phone: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/register', data, { auth: false }),
  login: (data: { phone: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', data, { auth: false }),
  me: () => api.get<AuthResponse>('/api/auth/me'),
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
    api.post<{ review: import('@/types').Review }>(`/api/businesses/${id}/review`, data),
}

export const postsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<{ posts: import('@/types').Post[] }>(`/api/posts${qs ? `?${qs}` : ''}`, { useCache: true })
  },
  create: (content: string) => api.post<{ post: import('@/types').Post }>('/api/posts', { content }),
}

export const circlesApi = {
  list: () => api.get<CircleListResponse>('/api/circles', { useCache: true }),
  create: (data: { name: string; description: string; initialChannel?: string }) =>
    api.post<{ circle: import('@/types').Circle }>('/api/circles', data),
  channels: (circleId: string) => api.get<{ channels: import('@/types').Channel[] }>(`/api/circles/${circleId}/channels`),
  createChannel: (circleId: string, name: string) =>
    api.post<{ channel: import('@/types').Channel }>(`/api/circles/${circleId}/channels`, { name }),
}

export const messagesApi = {
  list: (channelId: string) => api.get<{ messages: import('@/types').Message[] }>(`/api/channels/${channelId}/messages`),
  send: (channelId: string, content: string) =>
    api.post<{ message: import('@/types').Message }>(`/api/channels/${channelId}/messages`, { content }),
}

export const emergencyApi = {
  contacts: (lat?: number, lng?: number) =>
    api.get<{ contacts: import('@/types').EmergencyContact[]; nearby: import('@/types').EmergencyContact[] }>(
      `/api/emergency${lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : ''}`,
      { useCache: true }
    ),
}

export const buildingsApi = {
  list: () => api.get<{ buildings: import('@/types').Building[] }>('/api/buildings', { useCache: true }),
}

export const waitlistApi = {
  join: (data: { email?: string; phone?: string; city?: string }) =>
    api.post<{ queued: boolean; position: number }>('/api/waitlist', data, { auth: false }),
}
