import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'
import { userRepository } from './userRepository'

export type PasteVisibility = 'public' | 'unlisted' | 'private' | 'channel'

export interface Paste {
  id: string
  owner_id: string
  channel_id: string | null
  society_id: string | null
  title: string | null
  content: string
  language: string | null
  filename: string | null
  visibility: PasteVisibility
  expires_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  content_size: number
  line_count: number
  view_count: number
  copy_count: number
  download_count: number
}

export interface PasteWithOwner extends Paste {
  owner_name: string
}

export interface CreatePasteInput {
  owner_id: string
  channel_id?: string
  society_id?: string
  title?: string
  content: string
  language?: string
  filename?: string
  visibility?: PasteVisibility
  expires_at?: Date | null
}

export interface UpdatePasteInput {
  title?: string
  content?: string
  language?: string
  filename?: string
  visibility?: PasteVisibility
  expires_at?: Date | null
}

export interface PasteAccessCheck {
  allowed: boolean
  reason?: 'deleted' | 'expired' | 'private' | 'unauthorized' | 'not_found'
}

export class PasteRepository extends BaseRepository {
  private static inMemoryPastes: PasteWithOwner[] = []

  private pruneExpired(): void {
    const nowTime = new Date().getTime()
    PasteRepository.inMemoryPastes = PasteRepository.inMemoryPastes.filter(
      (p) => !p.expires_at || new Date(p.expires_at).getTime() > nowTime
    )
  }

  findById(id: string): Paste | null {
    this.pruneExpired()
    const p = PasteRepository.inMemoryPastes.find((x) => x.id === id && !x.deleted_at)
    return p || null
  }

  findByIdWithOwner(id: string): PasteWithOwner | null {
    this.pruneExpired()
    const p = PasteRepository.inMemoryPastes.find((x) => x.id === id && !x.deleted_at)
    return p || null
  }

  findPublic(options: QueryOptions = {}, filters: { language?: string; search?: string } = {}): PaginatedResult<PasteWithOwner> {
    this.pruneExpired()
    
    let filtered = PasteRepository.inMemoryPastes.filter(
      (p) => !p.deleted_at && p.visibility === 'public'
    )

    if (filters.language) {
      filtered = filtered.filter((p) => p.language === filters.language)
    }

    if (filters.search) {
      const s = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) => (p.title && p.title.toLowerCase().includes(s)) || p.content.toLowerCase().includes(s)
      )
    }

    // Sort by created_at desc
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const limit = options.limit || 20
    const offset = options.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      items: paginated,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  findByOwner(ownerId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    this.pruneExpired()
    const filtered = PasteRepository.inMemoryPastes.filter((p) => p.owner_id === ownerId && !p.deleted_at)
    
    // Sort desc
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const limit = options.limit || 50
    const offset = options.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      items: paginated,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  findByChannel(channelId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    this.pruneExpired()
    const filtered = PasteRepository.inMemoryPastes.filter((p) => p.channel_id === channelId && !p.deleted_at)
    
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const limit = options.limit || 50
    const offset = options.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      items: paginated,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  findBySociety(societyId: string, options: QueryOptions = {}): PaginatedResult<Paste> {
    this.pruneExpired()
    const filtered = PasteRepository.inMemoryPastes.filter((p) => p.society_id === societyId && !p.deleted_at)
    
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const limit = options.limit || 50
    const offset = options.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      items: paginated,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  create(input: CreatePasteInput): Paste {
    this.pruneExpired()
    const id = generateId()
    const timestamp = new Date()
    const contentSize = Buffer.byteLength(input.content, 'utf8')
    const lineCount = input.content.split('\n').length

    let ownerName = 'Unknown User'
    try {
      const user = userRepository.findById(input.owner_id)
      if (user) ownerName = user.name
    } catch {
      // ignore
    }

    const paste: PasteWithOwner = {
      id,
      owner_id: input.owner_id,
      owner_name: ownerName,
      channel_id: input.channel_id || null,
      society_id: input.society_id || null,
      title: input.title || null,
      content: input.content,
      language: input.language || null,
      filename: input.filename || null,
      visibility: input.visibility || 'private',
      expires_at: input.expires_at || null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      content_size: contentSize,
      line_count: lineCount,
      view_count: 0,
      copy_count: 0,
      download_count: 0,
    }

    PasteRepository.inMemoryPastes.push(paste)
    return paste
  }

  update(id: string, input: UpdatePasteInput): Paste | null {
    const existing = this.findById(id)
    if (!existing) return null

    if (input.title !== undefined) existing.title = input.title || null
    if (input.content !== undefined) {
      existing.content = input.content
      existing.content_size = Buffer.byteLength(input.content, 'utf8')
      existing.line_count = input.content.split('\n').length
    }
    if (input.language !== undefined) existing.language = input.language || null
    if (input.filename !== undefined) existing.filename = input.filename || null
    if (input.visibility !== undefined) existing.visibility = input.visibility
    if (input.expires_at !== undefined) existing.expires_at = input.expires_at

    existing.updated_at = new Date()
    return existing
  }

  softDelete(id: string): boolean {
    const p = PasteRepository.inMemoryPastes.find((x) => x.id === id)
    if (p) {
      p.deleted_at = new Date()
      p.updated_at = new Date()
      return true
    }
    return false
  }

  incrementViewCount(id: string): void {
    const p = this.findById(id)
    if (p) p.view_count += 1
  }

  incrementCopyCount(id: string): void {
    const p = this.findById(id)
    if (p) p.copy_count += 1
  }

  incrementDownloadCount(id: string): void {
    const p = this.findById(id)
    if (p) p.download_count += 1
  }

  recordView(pasteId: string, viewerId: string | null, ipHash: string | null): void {
    this.incrementViewCount(pasteId)
  }

  checkAccess(paste: Paste, userId: string | null, userChannelIds: string[] = [], userSocietyIds: string[] = []): PasteAccessCheck {
    if (paste.deleted_at) return { allowed: false, reason: 'deleted' }
    if (paste.expires_at && new Date(paste.expires_at) < new Date()) return { allowed: false, reason: 'expired' }

    switch (paste.visibility) {
      case 'public':
      case 'unlisted':
        return { allowed: true }
      case 'private':
        return { allowed: paste.owner_id === userId, reason: paste.owner_id === userId ? undefined : 'private' }
      case 'channel':
        if (paste.channel_id && userChannelIds.includes(paste.channel_id)) return { allowed: true }
        if (paste.society_id && userSocietyIds.includes(paste.society_id)) return { allowed: true }
        return { allowed: false, reason: 'unauthorized' }
      default:
        return { allowed: false, reason: 'not_found' }
    }
  }

  getLanguages(): string[] {
    this.pruneExpired()
    const langs = new Set<string>()
    for (const p of PasteRepository.inMemoryPastes) {
      if (p.language && !p.deleted_at) langs.add(p.language)
    }
    return Array.from(langs).sort()
  }

  getPopular(limit: number = 10): PasteWithOwner[] {
    this.pruneExpired()
    const filtered = PasteRepository.inMemoryPastes.filter((p) => p.visibility === 'public' && !p.deleted_at)
    filtered.sort((a, b) => b.view_count - a.view_count)
    return filtered.slice(0, limit)
  }

  getExpiringSoon(hours: number = 24): Paste[] {
    this.pruneExpired()
    const future = new Date(Date.now() + hours * 60 * 60 * 1000)
    return PasteRepository.inMemoryPastes.filter(
      (p) => p.visibility === 'public' && !p.deleted_at && p.expires_at && new Date(p.expires_at) <= future
    )
  }
}

export const pasteRepository = new PasteRepository()