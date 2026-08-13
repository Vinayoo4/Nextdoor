import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface EmergencyContact {
  id: string
  name: string
  type: 'police' | 'ambulance' | 'fire' | 'women' | 'other'
  phone: string
  address: string | null
  location_lat: number | null
  location_lng: number | null
  city: string | null
  created_at: Date
}

export interface CreateEmergencyInput {
  name: string
  type: 'police' | 'ambulance' | 'fire' | 'women' | 'other'
  phone: string
  address?: string
  location_lat?: number
  location_lng?: number
  city?: string
}

export class EmergencyRepository extends BaseRepository {
  private table = 'emergencies'

  findById(id: string): EmergencyContact | null {
    const row = this.executeQueryOne<EmergencyContact>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findAll(options: QueryOptions = {}): PaginatedResult<EmergencyContact> {
    const { query, params } = this.buildSelectQuery(this.table, options)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table)
    
    const items = this.executeQuery<EmergencyContact>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findNearby(lat: number, lng: number, radiusKm: number): EmergencyContact[] {
    const query = `
      SELECT * FROM ${this.table}
      WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL AND
      (6371 * acos(cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat)))) <= ?
    `
    const rows = this.executeQuery<EmergencyContact>(query, [lat, lng, lat, radiusKm])
    return rows.map(r => this.deserializeDates(r))
  }

  create(input: CreateEmergencyInput): EmergencyContact {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, name, type, phone, address, location_lat, location_lng, city, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.type, input.phone, input.address || null, input.location_lat || null, input.location_lng || null, input.city || 'Rewari', timestamp]
    )
    
    return this.findById(id)!
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }
}

export const emergencyRepository = new EmergencyRepository()
