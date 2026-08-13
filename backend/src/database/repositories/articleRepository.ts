import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'

export interface RewariArticle {
  id: string
  slug: string
  title: string
  content_markdown: string
  content_html: string | null
  category: 'history' | 'heritage' | 'places' | 'services' | 'businesses' | 'events' | 'future' | 'guides'
  locality: string | null
  status: ArticleStatus
  author_id: string
  reviewer_id: string | null
  source_reference: string | null
  last_verified_at: Date | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateArticleInput {
  slug: string
  title: string
  content_markdown: string
  content_html?: string
  category: 'history' | 'heritage' | 'places' | 'services' | 'businesses' | 'events' | 'future' | 'guides'
  locality?: string
  status?: ArticleStatus
  author_id: string
  source_reference?: string
}

export interface UpdateArticleInput {
  title?: string
  slug?: string
  content_markdown?: string
  content_html?: string
  category?: 'history' | 'heritage' | 'places' | 'services' | 'businesses' | 'events' | 'future' | 'guides'
  locality?: string | null
  status?: ArticleStatus
  reviewer_id?: string | null
  source_reference?: string | null
  last_verified_at?: Date | null
  published_at?: Date | null
}

export class ArticleRepository extends BaseRepository {
  private table = 'rewari_articles'

  findById(id: string): RewariArticle | null {
    const row = this.executeQueryOne<RewariArticle>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findBySlug(slug: string): RewariArticle | null {
    const row = this.executeQueryOne<RewariArticle>(`SELECT * FROM ${this.table} WHERE slug = ?`, [slug])
    return row ? this.deserializeDates(row) : null
  }

  findAll(options: QueryOptions = {}, filters: { status?: ArticleStatus; category?: string } = {}): PaginatedResult<RewariArticle> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    if (filters.category) {
      conditions.push('category = ?')
      params.push(filters.category)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<RewariArticle>(query, queryParams).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  create(input: CreateArticleInput): RewariArticle {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, slug, title, content_markdown, content_html, category, locality, status, author_id, reviewer_id, source_reference, last_verified_at, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?)`,
      [
        id, input.slug, input.title, input.content_markdown, input.content_html || null,
        input.category, input.locality || null, input.status || 'draft', input.author_id,
        input.source_reference || null, timestamp, timestamp
      ]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: UpdateArticleInput): RewariArticle | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    const fieldMap: Record<string, string> = {
      title: 'title',
      slug: 'slug',
      content_markdown: 'content_markdown',
      content_html: 'content_html',
      category: 'category',
      locality: 'locality',
      status: 'status',
      reviewer_id: 'reviewer_id',
      source_reference: 'source_reference',
    }

    for (const [key, column] of Object.entries(fieldMap)) {
      const value = (input as Record<string, unknown>)[key]
      if (value !== undefined) {
        updates.push(`${column} = ?`)
        params.push(value)
      }
    }

    if (input.last_verified_at !== undefined) {
      updates.push('last_verified_at = ?')
      params.push(input.last_verified_at ? input.last_verified_at.toISOString() : null)
    }
    if (input.published_at !== undefined) {
      updates.push('published_at = ?')
      params.push(input.published_at ? input.published_at.toISOString() : null)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    params.push(now())
    params.push(id)

    this.executeRun(`UPDATE ${this.table} SET ${updates.join(', ')} WHERE id = ?`, params)
    return this.findById(id)
  }
}

export const articleRepository = new ArticleRepository()
