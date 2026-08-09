export interface LatLng {
  lat: number
  lng: number
}

export type BusinessCategory =
  | 'Food'
  | 'Healthcare'
  | 'Govt'
  | 'Banking'
  | 'Education'
  | 'Worship'
  | 'Transport'
  | 'Shopping'
  | 'Services'
  | 'Emergency'

export interface Business {
  id: string
  name: string
  slug: string
  category: BusinessCategory
  subcategory: string | null
  tags: string[]
  address: string
  phone: string
  whatsapp: string | null
  hours: Record<string, { open: string; close: string }>
  photos: string[]
  attributes: { parking: boolean; cards: boolean; homeDelivery: boolean }
  ownerId: string | null
  verified: boolean
  plan: 'free' | 'promoted'
  ratingAvg: number
  ratingCount: number
  status: 'active' | 'pending' | 'suspended'
  description: string | null
  location: LatLng | null
  createdAt: string
}

export interface Post {
  id: string
  content: string
  authorName: string
  imageUrl: string | null
  createdAt: string
  userId: string
  location: LatLng | null
}

export interface Comment {
  id: string
  content: string
  postId: string
  authorName: string
  userId: string
  createdAt: string
}

export interface Review {
  id: string
  businessId: string
  userId: string
  rating: number
  text: string
  ownerReply: string | null
  createdAt: string
}

export interface Offer {
  id: string
  businessId: string
  title: string
  discount: string
  code: string | null
  validFrom: string
  validTo: string
  status: 'active' | 'expired'
}

export interface Circle {
  id: string
  name: string
  description: string
  channelCount: number
  createdAt: string
}

export interface Channel {
  id: string
  name: string
  circleId: string
  createdAt: string
}

export interface Message {
  id: string
  content: string
  channelId: string
  userId: string
  authorName: string
  createdAt: string
}

export interface Building {
  id: string
  name: string
  type: string
  address: string
  timings: string | null
  contact: string | null
  services: string[]
  description: string | null
  photos: string[]
  location: LatLng | null
}

export interface EmergencyContact {
  id?: string
  name: string
  type: 'police' | 'ambulance' | 'fire' | 'women' | 'other'
  phone: string
  address?: string
  location?: LatLng | null
}

export interface User {
  id: string
  phone: string
  name: string
  email: string | null
  role: 'user' | 'owner' | 'admin'
  points: number
  savedPlaces: string[]
}

export interface AuthResponse {
  token: string
  user: User
}

export interface BusinessListResponse {
  businesses: Business[]
  total: number
  page: number
  pages: number
}

export interface CircleListResponse {
  circles: Circle[]
}
