import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'
import { userRepository } from './userRepository'

export interface PasteComment {
  id: string
  paste_id: string
  user_id: string
  content: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreatePasteCommentInput {
  paste_id: string
  user_id: string
  content: string
}

export class PasteCommentRepository extends BaseRepository {
  private static inMemoryComments: PasteComment[] = []

  findById(id: string): PasteComment | null {
    const c = PasteCommentRepository.inMemoryComments.find((x) => x.id === id && !x.deleted_at)
    return c || null
  }

  findByPasteId(pasteId: string, options: QueryOptions = {}): PaginatedResult<PasteComment & { user_name: string }> {
    const limit = options.limit || 50
    const offset = options.offset || 0

    const filtered = PasteCommentRepository.inMemoryComments.filter(
      (c) => c.paste_id === pasteId && !c.deleted_at
    )

    // Sort ASC by created_at
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    const items = paginated.map((c) => {
      const user = userRepository.findById(c.user_id)
      return {
        ...c,
        user_name: user?.name || 'Unknown User'
      }
    })

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  create(input: CreatePasteCommentInput): PasteComment {
    const id = generateId()
    const timestamp = new Date()

    const comment: PasteComment = {
      id,
      paste_id: input.paste_id,
      user_id: input.user_id,
      content: input.content,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null
    }

    PasteCommentRepository.inMemoryComments.push(comment)
    return comment
  }

  update(id: string, content: string): PasteComment | null {
    const c = this.findById(id)
    if (!c) return null

    c.content = content
    c.updated_at = new Date()
    return c
  }

  softDelete(id: string): boolean {
    const c = PasteCommentRepository.inMemoryComments.find((x) => x.id === id)
    if (c) {
      c.deleted_at = new Date()
      c.updated_at = new Date()
      return true
    }
    return false
  }

  getPasteCommentCount(pasteId: string): number {
    return PasteCommentRepository.inMemoryComments.filter(
      (c) => c.paste_id === pasteId && !c.deleted_at
    ).length
  }
}

export const pasteCommentRepository = new PasteCommentRepository()