import type { IBusiness, IChannel, IComment, IMessage, IOffer, IPost, IReview, IBuilding, IEmergency, IUser } from '../models'

type WithId<T> = T & { _id: unknown }

function str(v: unknown): string | undefined {
  return v == null ? undefined : String(v)
}

export function serializePost(p: WithId<IPost>) {
  return {
    id: str(p._id),
    content: p.content,
    authorName: p.authorName,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt,
    userId: str(p.userId),
    location: p.location?.coordinates
      ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] }
      : null,
  }
}

export function serializeComment(c: WithId<IComment>) {
  return {
    id: str(c._id),
    content: c.content,
    postId: str(c.postId),
    authorName: c.authorName,
    userId: str(c.userId),
    createdAt: c.createdAt,
  }
}

export function serializeBusiness(b: WithId<IBusiness>) {
  return {
    id: str(b._id),
    name: b.name,
    slug: b.slug,
    category: b.category,
    subcategory: b.subcategory ?? null,
    tags: b.tags ?? [],
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp ?? null,
    hours: b.hours ?? {},
    photos: b.photos ?? [],
    attributes: b.attributes,
    ownerId: str(b.ownerId),
    verified: b.verified,
    plan: b.plan,
    ratingAvg: b.ratingAvg,
    ratingCount: b.ratingCount,
    status: b.status,
    description: b.description ?? null,
    location: b.location?.coordinates
      ? { lat: b.location.coordinates[1], lng: b.location.coordinates[0] }
      : null,
    createdAt: b.createdAt,
  }
}

export function serializeReview(r: WithId<IReview>) {
  return {
    id: str(r._id),
    businessId: str(r.businessId),
    userId: str(r.userId),
    rating: r.rating,
    text: r.text,
    ownerReply: r.ownerReply ?? null,
    createdAt: r.createdAt,
  }
}

export function serializeOffer(o: WithId<IOffer>) {
  return {
    id: str(o._id),
    businessId: str(o.businessId),
    title: o.title,
    discount: o.discount,
    code: o.code ?? null,
    validFrom: o.validFrom,
    validTo: o.validTo,
    status: o.status,
  }
}

export function serializeChannel(c: WithId<IChannel>) {
  return {
    id: str(c._id),
    name: c.name,
    circleId: str(c.circleId),
    createdAt: c.createdAt,
  }
}

export function serializeMessage(m: WithId<IMessage>) {
  return {
    id: str(m._id),
    content: m.content,
    channelId: str(m.channelId),
    userId: str(m.userId),
    authorName: m.authorName,
    createdAt: m.createdAt,
  }
}

export function serializeBuilding(b: WithId<IBuilding>) {
  return {
    id: str(b._id),
    name: b.name,
    type: b.type,
    address: b.address,
    timings: b.timings ?? null,
    contact: b.contact ?? null,
    services: b.services ?? [],
    description: b.description ?? null,
    photos: b.photos ?? [],
    location: b.location?.coordinates
      ? { lat: b.location.coordinates[1], lng: b.location.coordinates[0] }
      : null,
  }
}

export function serializeEmergency(e: WithId<IEmergency>) {
  return {
    id: str(e._id),
    name: e.name,
    type: e.type,
    phone: e.phone,
    address: e.address,
    location: e.location?.coordinates
      ? { lat: e.location.coordinates[1], lng: e.location.coordinates[0] }
      : null,
  }
}

export function serializeUser(u: WithId<IUser>) {
  return {
    id: str(u._id),
    name: u.name,
    email: u.email ?? null,
    role: u.role,
    points: u.points,
    savedPlaces: (u.savedPlaces ?? []).map((p) => str(p)),
  }
}
