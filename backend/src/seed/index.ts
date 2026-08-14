import 'dotenv/config'
import { runMigrations, getDatabase, closeDatabase } from '../database/connection'
import { userRepository } from '../database/repositories/userRepository'
import { businessRepository } from '../database/repositories/businessRepository'
import { postRepository } from '../database/repositories/postRepository'
import { commentRepository } from '../database/repositories/commentRepository'
import { buildingRepository } from '../database/repositories/buildingRepository'
import { emergencyRepository } from '../database/repositories/emergencyRepository'
import { circleRepository } from '../database/repositories/circleRepository'
import { channelRepository } from '../database/repositories/channelRepository'
import { reviewRepository } from '../database/repositories/reviewRepository'
import { offerRepository } from '../database/repositories/offerRepository'
import { analyticsRepository } from '../database/repositories/analyticsRepository'
import { env } from '../config/env'
import { BUSINESSES } from './data/businesses'
import { BUILDINGS } from './data/buildings'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

const SEED_POSTS = [
  'Morning walk around Bada Talab — the water is full and the Hanuman temple looks beautiful. 🌸',
  'Anyone else seen the puppies near the Railway Heritage Museum? Looking for homes, DM me.',
  'Station Road repair work is finally done. Commute to the junction is much smoother now.',
  'Fresh jalebis at Rawat Misthan Bhandar this morning, best with their rabri!',
  'Power cut scheduled in Model Town tomorrow 10am-2pm. Plan accordingly.',
  'New bookstore opened near Mata Chowk, great collection of local history books.',
  'Lost a blue wallet near Railway Chowk this evening. Reward for return.',
  'Food fest at the community hall near the New Bus Stand this Sunday, entry free for residents.',
  'The street light on Bawal Road has been out for a week, reported to Nagar Parishad but no action yet.',
  'Yoga session at the Bada Talab garden every 6am. All age groups welcome, free!',
]

async function seed() {
  console.log('Seeding SQLite database...')

  runMigrations()
  const db = getDatabase()

  // Reset
  db.prepare('DELETE FROM otps').run()
  db.prepare('DELETE FROM paste_comments').run()
  db.prepare('DELETE FROM paste_reports').run()
  db.prepare('DELETE FROM paste_views').run()
  db.prepare('DELETE FROM pastes').run()
  db.prepare('DELETE FROM analytics_events').run()
  db.prepare('DELETE FROM waitlist').run()
  db.prepare('DELETE FROM offers').run()
  db.prepare('DELETE FROM reviews').run()
  db.prepare('DELETE FROM emergencies').run()
  db.prepare('DELETE FROM buildings').run()
  db.prepare('DELETE FROM messages').run()
  db.prepare('DELETE FROM channels').run()
  db.prepare('DELETE FROM circle_members').run()
  db.prepare('DELETE FROM circles').run()
  db.prepare('DELETE FROM user_saved_places').run()
  db.prepare('DELETE FROM post_upvotes').run()
  db.prepare('DELETE FROM comments').run()
  db.prepare('DELETE FROM posts').run()
  db.prepare('DELETE FROM businesses').run()
  db.prepare('DELETE FROM rewari_articles').run()
  db.prepare('DELETE FROM article_revisions').run()
  db.prepare('DELETE FROM users').run()

  // Anonymous guest user used only as a fallback anchor for legacy local data.
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, points, created_at, updated_at)
     VALUES ('000000000000000000000000', 'guest@nextdoor.local', 'Guest User', 'guest_placeholder', 'user', 0, datetime('now'), datetime('now'))`
  ).run()

  // Bootstrap admin user (no password — logs in via email OTP).
  const users = []
  if (env.seedAdminEmail) {
    const admin = userRepository.create({
      name: 'City Admin',
      email: env.seedAdminEmail,
      role: 'admin',
      password_hash: '',
    })
    userRepository.addPoints(admin.id, 100)
    users.push(admin)
    console.log(`  admin user: ${admin.email} (role: admin)`)
  } else {
    console.log('  NOTE: SEED_ADMIN_EMAIL not set — no admin user created. Authority Portal will have no owner.')
  }

  // Businesses
  const businessDocs = []
  for (const b of BUSINESSES) {
    const doc = businessRepository.create({
      name: b.name,
      slug: `${slugify(b.name)}-${Math.random().toString(36).slice(2, 6)}`,
      category: b.category as any,
      subcategory: b.subcategory,
      description: b.description,
      address: b.address,
      phone: b.phone,
      whatsapp: b.whatsapp,
      tags: b.tags,
      hours: b.hours,
      attributes: b.attributes,
      verified: b.verified,
      plan: b.plan as any,
      location_lat: b.lat,
      location_lng: b.lng,
    })
    businessDocs.push({ doc, seed: b })
  }
  console.log(`  businesses: ${businessDocs.length}`)

  // Reviews
  const reviewTexts = [
    'Great service and very helpful staff. Highly recommended!',
    'Decent place, prices are reasonable for the area.',
    'Been coming here for years. Quality has stayed consistent.',
    'Good experience overall, though a bit crowded on weekends.',
    'Friendly people and quick service. Will visit again.',
    'Average experience, could improve on cleanliness.',
    'Excellent quality and worth every rupee.',
    'Location is convenient and easy to find.',
    'Loved it! The staff went out of their way to help.',
    'Good value for money. Recommend for first-timers.',
    'A neighbourhood favourite. Reliable and honest.',
    'Nice ambience but slightly overpriced.',
    'Quick turnaround and professional service.',
    'Authentic experience, exactly as advertised.',
    'Solid choice in this area. Four stars from me.',
  ]
  const reviewerIds = users.map((u) => u.id)
  for (let i = 0; i < reviewTexts.length && reviewerIds.length > 0; i++) {
    const b = businessDocs[i % businessDocs.length]
    const review = reviewRepository.create({
      business_id: b.doc.id,
      user_id: reviewerIds[i % reviewerIds.length],
      rating: 3 + (i % 3),
      text: reviewTexts[i],
    })
    if (i % 3 === 0) {
      db.prepare(`UPDATE reviews SET owner_reply = ? WHERE id = ?`).run('Thank you for your feedback!', review.id)
    }
  }

  // Recalculate business ratings
  for (const b of businessDocs) {
    businessRepository.updateRating(b.doc.id)
  }

  // Offers
  const offered = businessDocs.filter((b) => b.seed.offer).slice(0, 12)
  for (const b of offered) {
    const offer = b.seed.offer!
    offerRepository.create({
      business_id: b.doc.id,
      title: offer.title,
      discount: offer.discount,
      code: offer.code,
      valid_from: new Date(Date.now() - 7 * 86400000),
      valid_to: new Date(Date.now() + 45 * 86400000),
      status: 'active',
    })
  }
  console.log(`  offers: ${offered.length}`)

  // Posts (transient feed is pre-seeded into the transient store by the server,
  // so these rows are informational only and kept for reference).
  const postDocs = []
  for (let i = 0; i < SEED_POSTS.length; i++) {
    const author = users[i % Math.max(users.length, 1)]
    const post = postRepository.create({
      content: SEED_POSTS[i],
      user_id: author?.id ?? '000000000000000000000000',
      author_name: author?.name ?? 'Guest User',
      location_lat: 28.1928 + (Math.random() - 0.5) * 0.05,
      location_lng: 76.6186 + (Math.random() - 0.5) * 0.05,
    })
    postDocs.push(post)
  }
  console.log(`  posts (reference rows): ${postDocs.length}`)

  // Comments
  if (users.length > 0) {
    for (let i = 0; i < 10; i++) {
      const post = postDocs[i % postDocs.length]
      const author = users[(i + 1) % users.length]
      commentRepository.create({
        content: [
          'Totally agree!',
          'Thanks for sharing this.',
          'Can you share more details?',
          'This is really helpful for the community.',
          'Happened with me too last week.',
        ][i % 5],
        post_id: post.id,
        user_id: author.id,
        author_name: author.name,
      })
    }
  }

  // Buildings
  for (const bld of BUILDINGS) {
    buildingRepository.create({
      name: bld.name,
      type: bld.type as any,
      address: bld.address,
      timings: bld.timings,
      contact: bld.contact,
      services: bld.services,
      description: bld.description,
      photos: [],
      city_id: 'rewari',
      location_lat: bld.lat,
      location_lng: bld.lng,
    })
  }
  console.log(`  buildings: ${BUILDINGS.length}`)

  // Emergency contacts
  const emergencySeeds = [
    { name: 'Rewari City Police Station', type: 'police', phone: '112', lat: 28.193, lng: 76.6205, address: 'Circular Road, Rewari 123401' },
    { name: 'Rewari Police Lines', type: 'police', phone: '112', lat: 28.1972, lng: 76.6155, address: 'Police Lines, Rewari 123401' },
    { name: 'Bawal Police Station', type: 'police', phone: '112', lat: 28.0788, lng: 76.5871, address: 'Bawal, Rewari 123501' },
    { name: 'Civil Hospital Emergency', type: 'ambulance', phone: '108', lat: 28.1955, lng: 76.6225, address: 'Civil Hospital, Circular Road, Rewari 123401' },
    { name: 'Fire Station Rewari', type: 'fire', phone: '101', lat: 28.1965, lng: 76.6185, address: 'Circular Road, Rewari 123401' },
    { name: 'Women Helpline Cell', type: 'women', phone: '1091', lat: 28.1945, lng: 76.6215, address: 'Mini Secretariat, Circular Road, Rewari 123401' },
  ]
  for (const e of emergencySeeds) {
    emergencyRepository.create({
      name: e.name,
      type: e.type as any,
      phone: e.phone,
      address: e.address,
      location_lat: e.lat,
      location_lng: e.lng,
      city: 'Rewari',
    })
  }
  console.log(`  emergency contacts: ${emergencySeeds.length}`)

  // Circles, channels (PIN-protected). Chat messages are kept in transient
  // in-memory storage by the app, so none are seeded into the database.
  const circleDefs = [
    {
      name: 'Station Road & Railway Colony',
      description: 'For residents near Rewari Junction, Station Road and Railway Colony.',
      pin: '4561',
      channels: [
        { name: 'General', pin: '1011' },
        { name: 'Lost & Found', pin: '2012' },
        { name: 'Security Alerts', pin: '3013' },
      ],
    },
    {
      name: 'Main Market & Bada Talab',
      description: 'Neighbourhood updates for Main Market, Bada Talab and old city lanes.',
      pin: '4562',
      channels: [
        { name: 'General', pin: '1021' },
        { name: 'Food & Shops', pin: '2022' },
        { name: 'Heritage Walks', pin: '3023' },
      ],
    },
    {
      name: 'Model Town & Sector 4',
      description: 'For residents of Model Town, Sector 4 and New Housing Board colonies.',
      pin: '4563',
      channels: [
        { name: 'General', pin: '1031' },
        { name: 'Events', pin: '2032' },
        { name: 'Helpline', pin: '3033' },
      ],
    },
  ]
  for (const def of circleDefs) {
    const creator = users[0]
    if (!creator) {
      console.log('  NOTE: skipping circles because no admin user was created (set SEED_ADMIN_EMAIL)')
      break
    }
    const circle = circleRepository.create({
      name: def.name,
      description: def.description,
      creator_id: creator.id,
      pin: def.pin,
    })
    circleRepository.addMember(circle.id, creator.id, 'admin')

    for (const ch of def.channels) {
      channelRepository.create({ name: ch.name, circle_id: circle.id, pin: ch.pin })
    }
  }
  console.log(`  circles: ${circleDefs.length}, channels: ${circleDefs.reduce((a, c) => a + c.channels.length, 0)}`)

  // Analytics sample
  if (businessDocs.length > 0 && users.length > 0) {
    analyticsRepository.create({
      type: 'impression',
      listing_id: businessDocs[0].doc.id,
      user_id: users[0].id,
      meta: { source: 'seed' }
    })
  }

  closeDatabase()
  console.log('\nSeed complete.')
  console.log('  Login is passwordless (email OTP).')
  if (env.seedAdminEmail) {
    console.log(`  Admin email: ${env.seedAdminEmail}`)
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
