import { getDatabase } from '../connection'
import { randomUUID } from 'node:crypto'

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function generateId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 24)
}

export function now(): string {
  return new Date().toISOString()
}

export function rowToObject<T>(row: unknown): T {
  return row as T
}

export function rowsToObjects<T>(rows: unknown[]): T[] {
  return rows as T[]
}

export class BaseRepository {
  protected db = getDatabase()

  protected buildWhereClause(conditions: Record<string, unknown>): { clause: string; params: unknown[] } {
    const keys = Object.keys(conditions).filter(k => conditions[k] !== undefined && conditions[k] !== null)
    if (keys.length === 0) return { clause: '', params: [] }
    
    const clause = 'WHERE ' + keys.map(k => `${k} = ?`).join(' AND ')
    const params = keys.map(k => conditions[k])
    return { clause, params }
  }

  protected buildSelectQuery(table: string, options: QueryOptions = {}, whereClause = '', whereParams: unknown[] = []): { query: string; params: unknown[] } {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDir = 'DESC' } = options
    let query = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`
    let params = [...whereParams, limit, offset]
    return { query, params }
  }

  protected buildCountQuery(table: string, whereClause = '', whereParams: unknown[] = []): { query: string; params: unknown[] } {
    let query = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`
    return { query, params: whereParams }
  }

  protected executeQuery<T>(query: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(query)
    return stmt.all(...params) as T[]
  }

  protected executeQueryOne<T>(query: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(query)
    const row = stmt.get(...params) as T | undefined
    return row || null
  }

  protected executeRun(query: string, params: unknown[] = []): any {
    const stmt = this.db.prepare(query)
    return stmt.run(...params)
  }

  protected executeTransaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn)
    return transaction()
  }

  protected serializeDates(obj: any): any {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) {
        result[key] = value.toISOString()
      } else if (typeof value === 'object' && value !== null) {
        result[key] = JSON.stringify(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  protected deserializeDates<T>(obj: T, dateFields: string[] = ['created_at', 'updated_at', 'deleted_at', 'expires_at', 'valid_from', 'valid_to', 'joined_at', 'reviewed_at', 'last_verified_at', 'published_at']): T {
    const result = { ...obj } as any
    for (const field of dateFields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = new Date(result[field] as string)
      }
    }
    return result as T
  }

  protected parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (!value) return defaultValue
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return defaultValue
      }
    }
    return value as T
  }
}

export interface SoftDeleteEntity {
  deleted_at: Date | null | string
}

export function isDeleted(entity: SoftDeleteEntity): boolean {
  return !!entity.deleted_at
}

export function addSoftDeleteFilter(whereClause: string): string {
  const suffix = ' AND deleted_at IS NULL'
  return whereClause ? whereClause + suffix : 'WHERE deleted_at IS NULL'
}