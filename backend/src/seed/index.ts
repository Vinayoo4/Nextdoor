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
import { messageRepository } from '../database/repositories/messageRepository'
import { reviewRepository } from '../database/repositories/reviewRepository'
import { offerRepository } from '../database/repositories/offerRepository'
import { analyticsRepository } from '../database/repositories/analyticsRepository'
import { hashPassword } from '../utils/hash'
import { env } from '../config/env'
import { BUSINESSES } from './data/businesses'
import { BUILDINGS } from './data/buildings'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

const SEED_POSTS = [
  'Morning walk at Statue Circle — the flower beds are blooming beautifully today. 🌸',
  'Anyone else seeing the stray puppy near the park? Looking for a home, DM me.',
  'Road repair work on MI Road is finally done. Commute is much smoother now.',
  'Fresh kachoris at Rawat this morning, recommended with their green chutney!',
  'Power cut scheduled in C-Scheme tomorrow 10am-2pm. Plan accordingly.',
  'New book store opened near MNIT, great collection of local history books.',
  'Lost a blue wallet near Johari Bazaar this evening. Reward for return.',
  'Biryani fest at the local community hall this Sunday, entry free for residents.',
  'The 5th street light has been out for a week, reported to JMC but no action yet.',
  'Yoga session at the garden every 6am. All age groups welcome, free!',
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

  // Users
  const adminPassword = await hashPassword(env.seedAdminPassword)
  const userPassword = await hashPassword('User@1234')
  const ownerPassword = await hashPassword('Owner@1234')

  const admin = userRepository.create({
    name: 'City Admin',
    email: 'admin@nextdoor.local',
    role: 'admin',
    password_hash: adminPassword
  })
  userRepository.addPoints(admin.id, 100)

  const owner = userRepository.create({
    name: 'Ramesh Sharma',
    email: 'ramesh@nextdoor.local',
    role: 'owner',
    password_hash: ownerPassword
  })
  userRepository.addPoints(owner.id, 40)

  const regular = userRepository.create({
    name: 'Priya Singh',
    email: 'priya@nextdoor.local',
    role: 'user',
    password_hash: userPassword
  })
  userRepository.addPoints(regular.id, 15)

  const rahul = userRepository.create({
    name: 'Rahul Verma',
    email: 'rahul@nextdoor.local',
    role: 'user',
    password_hash: userPassword
  })
  userRepository.addPoints(rahul.id, 8)

  const users = [admin, owner, regular, rahul]
  console.log(`  users: ${users.length}`)

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
      owner_id: b.name === 'SALTEDHASH' ? owner.id : (Math.random() > 0.7 ? owner.id : undefined),
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
  const reviewUsers = [regular, rahul, owner]
  for (let i = 0; i < 15; i++) {
    const b = businessDocs[i % businessDocs.length]
    const rating = 3 + (i % 3)
    const review = reviewRepository.create({
      business_id: b.doc.id,
      user_id: reviewUsers[i % reviewUsers.length].id,
      rating,
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

  // Posts
  const posters = [regular, rahul, owner, admin]
  const postDocs = []
  for (let i = 0; i < SEED_POSTS.length; i++) {
    const author = posters[i % posters.length]
    const post = postRepository.create({
      content: SEED_POSTS[i],
      user_id: author.id,
      author_name: author.name,
      location_lat: 28.1928 + (Math.random() - 0.5) * 0.05,
      location_lng: 76.6186 + (Math.random() - 0.5) * 0.05,
    })
    postDocs.push(post)
  }
  console.log(`  posts: ${postDocs.length}`)

  // Comments
  for (let i = 0; i < 10; i++) {
    const post = postDocs[i % postDocs.length]
    const author = posters[(i + 1) % posters.length]
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
    { name: 'Ashok Nagar Police Station', type: 'police', phone: '+91 141 237 1100', lat: 26.9045, lng: 75.8078, address: 'Ashok Marg, C-Scheme, Rewari' },
    { name: 'Malviya Nagar Police Station', type: 'police', phone: '+91 141 250 0043', lat: 26.8553, lng: 75.8145, address: 'Malviya Nagar, Rewari' },
    { name: 'Vaishali Nagar Police Station', type: 'police', phone: '+91 141 235 0032', lat: 26.9101, lng: 75.7611, address: 'Vaishali Nagar, Rewari' },
    { name: 'Choti Chaupar Police Station', type: 'police', phone: '+91 141 256 1122', lat: 26.9231, lng: 75.8198, address: 'Choti Chaupar, Rewari' },
    { name: 'SMS Hospital Emergency', type: 'ambulance', phone: '108', lat: 26.8997, lng: 75.8152, address: 'SMS Hospital, JLN Marg, Rewari' },
    { name: 'Fire Station — Mansarovar', type: 'fire', phone: '101', lat: 26.8541, lng: 75.7718, address: 'Mansarovar, Rewari' },
    { name: 'Fire Station — Jawahar Nagar', type: 'fire', phone: '101', lat: 26.9271, lng: 75.7921, address: 'Jawahar Nagar, Rewari' },
    { name: 'Women Helpline Cell', type: 'women', phone: '1091', lat: 26.9082, lng: 75.7982, address: 'Collectorate, MI Road, Rewari' },
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

  // Circles, channels, messages
  const circleDefs = [
    {
      name: 'C-Scheme Residents',
      description: 'For residents of C-Scheme, Ashok Nagar and nearby areas.',
      channels: ['General', 'Lost & Found', 'Security Alerts'],
    },
    {
      name: 'Malviya Nagar Community',
      description: 'Neighbourhood updates for Malviya Nagar and JLN Marg.',
      channels: ['General', 'Food & Restaurants', 'Events'],
    },
    {
      name: 'Startup & Freelance Hub',
      description: 'For Rewari based founders, freelancers and remote workers.',
      channels: ['General', 'Job Opportunities', 'Co-working'],
    },
  ]
  const channelMessageSeeds = [
    'Welcome everyone!',
    'Has anyone faced water supply issues today?',
    'Gymkhana club is hosting a weekend event, details in Events.',
    'Looking for a reliable plumber near C-Scheme.',
    'The new metro card works at Sindhi Camp station now.',
    'Morning tea meetup at Tapri Central this Sunday, 8am!',
  ]
  for (const def of circleDefs) {
    const circle = circleRepository.create({
      name: def.name,
      description: def.description,
      creator_id: admin.id,
    })
    
    circleRepository.addMember(circle.id, owner.id)
    circleRepository.addMember(circle.id, regular.id)
    
    for (const chName of def.channels) {
      const channel = channelRepository.create({ name: chName, circle_id: circle.id })
      for (let i = 0; i < 2; i++) {
        const author = posters[(i + circleDefs.indexOf(def)) % posters.length]
        messageRepository.create({
          content: channelMessageSeeds[(i + channelMessageSeeds.length - circleDefs.indexOf(def)) % channelMessageSeeds.length],
          channel_id: channel.id,
          user_id: author.id,
          author_name: author.name,
        })
      }
    }
  }
  console.log(`  circles: ${circleDefs.length}, channels: ${circleDefs.reduce((a, c) => a + c.channels.length, 0)}`)

  // Analytics sample
  analyticsRepository.create({
    type: 'impression',
    listing_id: businessDocs[0].doc.id,
    user_id: regular.id,
    meta: { source: 'seed' }
  })

  closeDatabase()
  console.log('\nSeed complete.')
  console.log('  Login as admin:')
  console.log(`    phone: ${env.seedAdminPhone}  password: ${env.seedAdminPassword}`)
  console.log('  Login as owner:')
  console.log('    phone: 9888000011  password: Owner@1234')
  console.log('  Login as user:')
  console.log('    phone: 9888000022  password: User@1234')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
