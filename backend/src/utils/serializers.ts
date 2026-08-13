import { userSavedPlacesRepository } from '../database/repositories/userSavedPlacesRepository'

function str(v: unknown): string | undefined {
  return v == null ? undefined : String(v)
}

export function serializePost(p: any) {
  return {
    id: str(p.id ?? p._id),
    content: p.content,
    authorName: p.author_name ?? p.authorName,
    imageUrl: p.image_url ?? p.imageUrl ?? null,
    createdAt: p.created_at ?? p.createdAt,
    userId: str(p.user_id ?? p.userId),
    location: p.location_lat !== undefined && p.location_lng !== undefined && p.location_lat !== null && p.location_lng !== null
      ? { lat: p.location_lat, lng: p.location_lng }
      : p.location?.coordinates
        ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] }
        : null,
  }
}

export function serializeComment(c: any) {
  return {
    id: str(c.id ?? c._id),
    content: c.content,
    postId: str(c.post_id ?? c.postId),
    authorName: c.author_name ?? c.authorName,
    userId: str(c.user_id ?? c.userId),
    createdAt: c.created_at ?? c.createdAt,
  }
}

export function serializeBusiness(b: any) {
  const tags = typeof b.tags === 'string' ? JSON.parse(b.tags) : (b.tags ?? [])
  const hours = typeof b.hours === 'string' ? JSON.parse(b.hours) : (b.hours ?? {})
  const photos = typeof b.photos === 'string' ? JSON.parse(b.photos) : (b.photos ?? [])
  const attributes = typeof b.attributes === 'string' ? JSON.parse(b.attributes) : (b.attributes ?? { parking: false, cards: false, homeDelivery: false })

  return {
    id: str(b.id ?? b._id),
    name: b.name,
    slug: b.slug,
    category: b.category,
    subcategory: b.subcategory ?? null,
    tags,
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp ?? null,
    hours,
    photos,
    attributes,
    ownerId: str(b.owner_id ?? b.ownerId),
    verified: Boolean(b.verified),
    plan: b.plan ?? 'free',
    ratingAvg: b.rating_avg ?? b.ratingAvg ?? 0,
    ratingCount: b.rating_count ?? b.ratingCount ?? 0,
    status: b.status ?? 'active',
    description: b.description ?? null,
    location: b.location_lat !== undefined && b.location_lng !== undefined && b.location_lat !== null && b.location_lng !== null
      ? { lat: b.location_lat, lng: b.location_lng }
      : b.location?.coordinates
        ? { lat: b.location.coordinates[1], lng: b.location.coordinates[0] }
        : null,
    createdAt: b.created_at ?? b.createdAt,
  }
}

export function serializeReview(r: any) {
  return {
    id: str(r.id ?? r._id),
    businessId: str(r.business_id ?? r.businessId),
    userId: str(r.user_id ?? r.userId),
    rating: r.rating,
    text: r.text,
    ownerReply: r.owner_reply ?? r.ownerReply ?? null,
    createdAt: r.created_at ?? r.createdAt,
  }
}

export function serializeOffer(o: any) {
  return {
    id: str(o.id ?? o._id),
    businessId: str(o.business_id ?? o.businessId),
    title: o.title,
    discount: o.discount,
    code: o.code ?? null,
    validFrom: o.valid_from ?? o.validFrom,
    validTo: o.valid_to ?? o.validTo,
    status: o.status,
  }
}

export function serializeChannel(c: any) {
  return {
    id: str(c.id ?? c._id),
    name: c.name,
    circleId: str(c.circle_id ?? c.circleId),
    createdAt: c.created_at ?? c.createdAt,
  }
}

export function serializeMessage(m: any) {
  return {
    id: str(m.id ?? m._id),
    content: m.content,
    channelId: str(m.channel_id ?? m.channelId),
    userId: str(m.user_id ?? m.userId),
    authorName: m.author_name ?? m.authorName,
    type: m.type ?? 'text',
    pasteId: str(m.paste_id ?? m.pasteId ?? null) ?? null,
    createdAt: m.created_at ?? m.createdAt,
  }
}

export function serializeBuilding(b: any) {
  const services = typeof b.services === 'string' ? JSON.parse(b.services) : (b.services ?? [])
  const photos = typeof b.photos === 'string' ? JSON.parse(b.photos) : (b.photos ?? [])

  return {
    id: str(b.id ?? b._id),
    name: b.name,
    type: b.type,
    address: b.address,
    timings: b.timings ?? null,
    contact: b.contact ?? null,
    services,
    description: b.description ?? null,
    photos,
    location: b.location_lat !== undefined && b.location_lng !== undefined && b.location_lat !== null && b.location_lng !== null
      ? { lat: b.location_lat, lng: b.location_lng }
      : b.location?.coordinates
        ? { lat: b.location.coordinates[1], lng: b.location.coordinates[0] }
        : null,
  }
}

export function serializeEmergency(e: any) {
  return {
    id: str(e.id ?? e._id),
    name: e.name,
    type: e.type,
    phone: e.phone,
    address: e.address,
    location: e.location_lat !== undefined && e.location_lng !== undefined && e.location_lat !== null && e.location_lng !== null
      ? { lat: e.location_lat, lng: e.location_lng }
      : e.location?.coordinates
        ? { lat: e.location.coordinates[1], lng: e.location.coordinates[0] }
        : null,
  }
}

export function serializeUser(u: any) {
  const userId = str(u.id ?? u._id)
  const savedPlaces = userId ? userSavedPlacesRepository.getSavedBusinesses(userId) : []
  return {
    id: userId,
    name: u.name,
    email: u.email ?? null,
    role: u.role,
    points: u.points ?? 0,
    savedPlaces,
  }
}

export function serializePaste(p: any) {
  return {
    id: str(p.id),
    ownerId: str(p.owner_id),
    ownerName: p.owner_name ?? null,
    channelId: str(p.channel_id) ?? null,
    societyId: str(p.society_id) ?? null,
    title: p.title ?? null,
    content: p.content,
    language: p.language ?? null,
    filename: p.filename ?? null,
    visibility: p.visibility,
    expiresAt: p.expires_at ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    deletedAt: p.deleted_at ?? null,
    contentSize: p.content_size ?? 0,
    lineCount: p.line_count ?? 0,
    viewCount: p.view_count ?? 0,
    copyCount: p.copy_count ?? 0,
    downloadCount: p.download_count ?? 0
  }
}

export function serializePasteComment(c: any) {
  return {
    id: str(c.id),
    pasteId: str(c.paste_id),
    userId: str(c.user_id),
    userName: c.user_name ?? null,
    content: c.content,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }
}
