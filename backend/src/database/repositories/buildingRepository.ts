import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export type BuildingType =
  | 'govt'
  | 'hospital'
  | 'heritage'
  | 'transport'
  | 'emergency'
  | 'banking'
  | 'education'
  | 'worship'

export interface Building {
  id: string
  name: string
  type: BuildingType
  address: string
  timings: string | null
  contact: string | null
  services: string[]
  description: string | null
  photos: string[]
  city_id: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: Date
  updated_at: Date
}

export interface CreateBuildingInput {
  name: string
  type: BuildingType
  address: string
  timings?: string
  contact?: string
  services?: string[]
  description?: string
  photos?: string[]
  city_id?: string
  location_lat?: number
  location_lng?: number
}

export class BuildingRepository extends BaseRepository {
  private table = 'buildings'

  findById(id: string): Building | null {
    const row = this.executeQueryOne<Building>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeBuilding(row) : null
  }

  findAll(options: QueryOptions = {}, filters: { type?: string } = {}): PaginatedResult<Building> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.type) {
      conditions.push('type = ?')
      params.push(filters.type)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { query, params: queryParams } = this.buildSelectQuery(this.table, options, where, params)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table, where, params)
    
    const items = this.executeQuery<Building>(query, queryParams).map(r => this.deserializeBuilding(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findGuide(cityId: string = 'jaipur'): Building[] {
    const rows = this.executeQuery<Building>(
      `SELECT * FROM ${this.table} WHERE city_id = ? ORDER BY name ASC`,
      [cityId]
    )
    return rows.map(r => this.deserializeBuilding(r))
  }

  findNearest(lat: number, lng: number, maxDistanceKm: number = 3): { building: Building; distanceM: number } | null {
    const query = `
      SELECT *, (6371 * acos(cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat)))) AS distance
      FROM ${this.table}
      WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
      ORDER BY distance ASC
      LIMIT 1
    `
    const row = this.executeQueryOne<Building & { distance: number }>(query, [lat, lng, lat])
    if (row && row.distance <= maxDistanceKm) {
      return {
        building: this.deserializeBuilding(row),
        distanceM: Math.round(row.distance * 1000)
      }
    }
    return null
  }

  create(input: CreateBuildingInput): Building {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, name, type, address, timings, contact, services, description, photos, city_id, location_lat, location_lng, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.name, input.type, input.address, input.timings || null, input.contact || null,
        JSON.stringify(input.services || []), input.description || null, JSON.stringify(input.photos || []),
        input.city_id || 'jaipur', input.location_lat || null, input.location_lng || null, timestamp, timestamp
      ]
    )
    
    return this.findById(id)!
  }

  deleteAll(): void {
    this.executeRun(`DELETE FROM ${this.table}`)
  }

  private deserializeBuilding(row: Building): Building {
    const deserialized = this.deserializeDates(row)
    return {
      ...deserialized,
      services: this.parseJsonField(deserialized.services, []),
      photos: this.parseJsonField(deserialized.photos, [])
    }
  }
}

export const buildingRepository = new BuildingRepository()
