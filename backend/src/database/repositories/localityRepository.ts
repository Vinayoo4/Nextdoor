import { BaseRepository, generateId, now, QueryOptions, PaginatedResult } from './base'

export interface Locality {
  id: string
  name: string
  city: string
  state: string | null
  center_lat: number | null
  center_lng: number | null
  radius_km: number
  created_at: Date
}

export interface CreateLocalityInput {
  name: string
  city: string
  state?: string
  center_lat?: number
  center_lng?: number
  radius_km?: number
}

export class LocalityRepository extends BaseRepository {
  private table = 'localities'

  findById(id: string): Locality | null {
    const row = this.executeQueryOne<Locality>(`SELECT * FROM ${this.table} WHERE id = ?`, [id])
    return row ? this.deserializeDates(row) : null
  }

  findByNameAndCity(name: string, city: string): Locality | null {
    const row = this.executeQueryOne<Locality>(
      `SELECT * FROM ${this.table} WHERE name = ? AND city = ?`,
      [name, city]
    )
    return row ? this.deserializeDates(row) : null
  }

  findAll(options: QueryOptions = {}): PaginatedResult<Locality> {
    const { query, params } = this.buildSelectQuery(this.table, options)
    const { query: countQuery, params: countParams } = this.buildCountQuery(this.table)
    
    const items = this.executeQuery<Locality>(query, params).map(r => this.deserializeDates(r))
    const total = this.executeQueryOne<{ count: number }>(countQuery, countParams)?.count || 0
    
    return {
      items,
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
      pageSize: options.limit || 50,
      totalPages: Math.ceil(total / (options.limit || 50))
    }
  }

  findByCity(city: string): Locality[] {
    const rows = this.executeQuery<Locality>(
      `SELECT * FROM ${this.table} WHERE city = ? ORDER BY name`,
      [city]
    )
    return rows.map(r => this.deserializeDates(r))
  }

  create(input: CreateLocalityInput): Locality {
    const id = generateId()
    const timestamp = now()
    
    this.executeRun(
      `INSERT INTO ${this.table} (id, name, city, state, center_lat, center_lng, radius_km, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.city, input.state || null, input.center_lat || null, input.center_lng || null, input.radius_km || 5, timestamp]
    )
    
    return this.findById(id)!
  }

  update(id: string, input: Partial<CreateLocalityInput>): Locality | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name) }
    if (input.city !== undefined) { updates.push('city = ?'); params.push(input.city) }
    if (input.state !== undefined) { updates.push('state = ?'); params.push(input.state) }
    if (input.center_lat !== undefined) { updates.push('center_lat = ?'); params.push(input.center_lat) }
    if (input.center_lng !== undefined) { updates.push('center_lng = ?'); params.push(input.center_lng) }
    if (input.radius_km !== undefined) { updates.push('radius_km = ?'); params.push(input.radius_km) }

    if (updates.length === 0) return existing

    params.push(id)
    this.executeRun(`UPDATE ${this.table} SET ${updates.join(', ')} WHERE id = ?`, params)
    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.executeRun(`DELETE FROM ${this.table} WHERE id = ?`, [id])
    return result.changes > 0
  }

  seedDefault(): void {
    const defaults = [
      { name: 'Sector 1', city: 'Rewari', state: 'Haryana', center_lat: 28.1928, center_lng: 76.6186, radius_km: 3 },
      { name: 'Sector 2', city: 'Rewari', state: 'Haryana', center_lat: 28.1856, center_lng: 76.6234, radius_km: 3 },
      { name: 'Sector 3', city: 'Rewari', state: 'Haryana', center_lat: 28.1987, center_lng: 76.6123, radius_km: 3 },
      { name: 'Model Town', city: 'Rewari', state: 'Haryana', center_lat: 28.1892, center_lng: 76.6298, radius_km: 2 },
      { name: 'Gandhi Nagar', city: 'Rewari', state: 'Haryana', center_lat: 28.2012, center_lng: 76.6056, radius_km: 2 },
      { name: 'Shakti Nagar', city: 'Rewari', state: 'Haryana', center_lat: 28.1945, center_lng: 76.6334, radius_km: 2 },
      { name: 'Dharuhera', city: 'Rewari', state: 'Haryana', center_lat: 28.2189, center_lng: 76.7789, radius_km: 5 },
      { name: 'Bawal', city: 'Rewari', state: 'Haryana', center_lat: 28.0987, center_lng: 76.5876, radius_km: 5 }
    ]

    for (const loc of defaults) {
      const existing = this.findByNameAndCity(loc.name, loc.city)
      if (!existing) {
        this.create(loc)
      }
    }
  }
}

export const localityRepository = new LocalityRepository()