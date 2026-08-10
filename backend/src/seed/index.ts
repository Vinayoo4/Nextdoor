import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db'
import { User } from '../models/User'
import { Post } from '../models/Post'
import { Comment } from '../models/Comment'
import { Business, slugify } from '../models/Business'
import { Circle } from '../models/Circle'
import { Channel } from '../models/Channel'
import { Message } from '../models/Message'
import { Building } from '../models/Building'
import { Emergency } from '../models/Emergency'
import { Review } from '../models/Review'
import { Offer } from '../models/Offer'
import { AnalyticsEvent } from '../models/AnalyticsEvent'
import { Waitlist } from '../models/Waitlist'
import { hashPassword } from '../utils/hash'
import { env } from '../config/env'
import { BUSINESSES } from './data/businesses'
import { BUILDINGS } from './data/buildings'

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
  console.log('Seeding database...')

  // Reset
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Business.deleteMany({}),
    Circle.deleteMany({}),
    Channel.deleteMany({}),
    Message.deleteMany({}),
    Building.deleteMany({}),
    Emergency.deleteMany({}),
    Review.deleteMany({}),
    Offer.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    Waitlist.deleteMany({}),
  ])

  // Users

  const admin = await User.create({
    name: 'City Admin',
    email: 'admin@nextdoor.local',
    role: 'admin',
    points: 100,
  })
  const owner = await User.create({
    name: 'Ramesh Sharma',
    email: 'ramesh@nextdoor.local',
    role: 'owner',
    points: 40,
  })
  const regular = await User.create({
    name: 'Priya Singh',
    email: 'priya@nextdoor.local',
    role: 'user',
    points: 15,
  })
  const rahul = await User.create({
    name: 'Rahul Verma',
    email: 'rahul@nextdoor.local',
    role: 'user',
    points: 8,
  })
  const users = [admin, owner, regular, rahul]
  console.log(`  users: ${users.length}`)

  // Businesses
  const businessDocs = []
  for (const b of BUSINESSES) {
    const doc = await Business.create({
      name: b.name,
      slug: `${slugify(b.name)}-${Math.random().toString(36).slice(2, 6)}`,
      category: b.category,
      subcategory: b.subcategory,
      description: b.description,
      address: b.address,
      phone: b.phone,
      whatsapp: b.whatsapp,
      tags: b.tags,
      location: { type: 'Point', coordinates: [b.lng, b.lat] },
      hours: b.hours,
      attributes: b.attributes,
      ownerId: b.name === 'SALTEDHASH' ? owner._id : (Math.random() > 0.7 ? owner._id : undefined),
      verified: b.verified,
      plan: b.plan,
      ratingAvg: 0,
      ratingCount: 0,
      status: 'active',
    })
    businessDocs.push({ doc, seed: b })
  }
  console.log(`  businesses: ${businessDocs.length}`)

  // Reviews (15 spread across first businesses)
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
    const review = await Review.create({
      businessId: b.doc._id,
      userId: reviewUsers[i % reviewUsers.length]._id,
      rating,
      text: reviewTexts[i],
      ownerReply: i % 3 === 0 ? 'Thank you for your feedback!' : undefined,
    })
    void review
  }

  // Recompute ratings
  const allBusinesses = await Business.find({})
  for (const b of allBusinesses) {
    const [agg] = await Review.aggregate<{ avg: number; count: number }>([
      { $match: { businessId: b._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    if (agg) {
      b.ratingAvg = Math.round(agg.avg * 10) / 10
      b.ratingCount = agg.count
      await b.save()
    }
  }

  // Offers (12 active)
  const offered = businessDocs.filter((b) => b.seed.offer).slice(0, 12)
  for (const b of offered) {
    const offer = b.seed.offer!
    await Offer.create({
      businessId: b.doc._id,
      title: offer.title,
      discount: offer.discount,
      code: offer.code,
      validFrom: new Date(Date.now() - 7 * 86400000),
      validTo: new Date(Date.now() + 45 * 86400000),
      status: 'active',
    })
  }
  console.log(`  offers: ${offered.length}`)

  // Posts
  const posters = [regular, rahul, owner, admin]
  const postDocs = []
  for (let i = 0; i < SEED_POSTS.length; i++) {
    const author = posters[i % posters.length]
    const post = await Post.create({
      content: SEED_POSTS[i],
      userId: author._id,
      authorName: author.name,
      location: {
        type: 'Point',
        coordinates: [76.6186 + (Math.random() - 0.5) * 0.05, 28.1928 + (Math.random() - 0.5) * 0.05],
      },
    })
    postDocs.push(post)
  }
  console.log(`  posts: ${postDocs.length}`)

  // Comments on some posts
  for (let i = 0; i < 10; i++) {
    const post = postDocs[i % postDocs.length]
    const author = posters[(i + 1) % posters.length]
    await Comment.create({
      content: [
        'Totally agree!',
        'Thanks for sharing this.',
        'Can you share more details?',
        'This is really helpful for the community.',
        'Happened with me too last week.',
      ][i % 5],
      postId: post._id,
      userId: author._id,
      authorName: author.name,
    })
  }

  // Buildings
  for (const bld of BUILDINGS) {
    await Building.create({
      name: bld.name,
      type: bld.type,
      address: bld.address,
      timings: bld.timings,
      contact: bld.contact,
      services: bld.services,
      description: bld.description,
      photos: [],
      cityId: 'jaipur',
      location: { type: 'Point', coordinates: [bld.lng, bld.lat] },
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
    await Emergency.create({
      name: e.name,
      type: e.type as 'police',
      phone: e.phone,
      address: e.address,
      location: { type: 'Point', coordinates: [e.lng, e.lat] },
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
    const circle = await Circle.create({
      name: def.name,
      description: def.description,
      creatorId: admin._id,
      memberIds: [admin._id, owner._id, regular._id],
    })
    for (const chName of def.channels) {
      const channel = await Channel.create({ name: chName, circleId: circle._id })
      for (let i = 0; i < 2; i++) {
        const author = posters[(i + circleDefs.indexOf(def)) % posters.length]
        await Message.create({
          content: channelMessageSeeds[(i + channelMessageSeeds.length - circleDefs.indexOf(def)) % channelMessageSeeds.length],
          channelId: channel._id,
          userId: author._id,
          authorName: author.name,
        })
      }
    }
  }
  console.log(`  circles: ${circleDefs.length}, channels: ${circleDefs.reduce((a, c) => a + c.channels.length, 0)}`)

  // Analytics sample
  await AnalyticsEvent.create({ type: 'impression', listingId: businessDocs[0].doc._id, userId: regular._id, meta: { source: 'seed' } })

  await disconnectDB()
  console.log('\nSeed complete.')
  console.log('  Login as admin:')
  console.log(`    phone: ${env.seedAdminPhone}  password: ${env.seedAdminPassword}`)
  console.log('  Login as owner:')
  console.log('    phone: 9888000011  password: Owner@1234')
  console.log('  Login as user:')
  console.log('    phone: 9888000022  password: User@1234')
}

connectDB()
  .then(seed)
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
