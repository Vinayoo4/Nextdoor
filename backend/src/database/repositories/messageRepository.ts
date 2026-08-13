import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Message {
  id: string
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type: 'text' | 'paste'
  paste_id: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  expires_at: Date | null
}

export interface CreateMessageInput {
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type?: 'text' | 'paste'
  paste_id?: string
  expires_at?: Date | null
}

export class MessageRepository extends BaseRepository {
  private static inMemoryMessages: Message[] = []

  private pruneExpired(): void {
    const nowTime = new Date().getTime()
    MessageRepository.inMemoryMessages = MessageRepository.inMemoryMessages.filter(
      (m) => !m.expires_at || new Date(m.expires_at).getTime() > nowTime
    )
  }

  findById(id: string): Message | null {
    this.pruneExpired()
    const msg = MessageRepository.inMemoryMessages.find((m) => m.id === id && !m.deleted_at)
    return msg || null
  }

  findByChannelId(channelId: string, options: QueryOptions = {}): PaginatedResult<Message> {
    this.pruneExpired()
    
    let filtered = MessageRepository.inMemoryMessages.filter(
      (m) => m.channel_id === channelId && !m.deleted_at
    )

    // Sort by created_at (options.orderBy, options.orderDir)
    const orderDir = options.orderDir || 'DESC'
    filtered.sort((a, b) => {
      const tA = new Date(a.created_at).getTime()
      const tB = new Date(b.created_at).getTime()
      return orderDir === 'ASC' ? tA - tB : tB - tA
    })

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

  findByPasteId(pasteId: string): Message | null {
    this.pruneExpired()
    const msg = MessageRepository.inMemoryMessages.find((m) => m.paste_id === pasteId && !m.deleted_at)
    return msg || null
  }

  create(input: CreateMessageInput): Message {
    this.pruneExpired()
    const id = generateId()
    const timestamp = new Date()

    const message: Message = {
      id,
      channel_id: input.channel_id,
      user_id: input.user_id,
      author_name: input.author_name,
      content: input.content,
      type: input.type || 'text',
      paste_id: input.paste_id || null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      expires_at: input.expires_at || null,
    }

    MessageRepository.inMemoryMessages.push(message)
    return message
  }

  softDelete(id: string): boolean {
    const msg = MessageRepository.inMemoryMessages.find((m) => m.id === id)
    if (msg) {
      msg.deleted_at = new Date()
      msg.updated_at = new Date()
      return true
    }
    return false
  }

  getChannelMessageCount(channelId: string): number {
    this.pruneExpired()
    return MessageRepository.inMemoryMessages.filter(
      (m) => m.channel_id === channelId && !m.deleted_at
    ).length
  }
}

export const messageRepository = new MessageRepository()