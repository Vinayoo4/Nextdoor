import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '../config/env'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = resolve(__dirname, '..', '..', '..', env.databasePath || './data/app.db')
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32768')
  db.pragma('temp_store = MEMORY')
  db.pragma('mmap_size = 268435456')
  db.pragma('page_size = 4096')

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function runMigrations(): void {
  const database = getDatabase()

  // 1. Run migrations for ALTERing tables if they exist
  try {
    const circlesInfo = database.pragma("table_info(circles)") as any[];
    const circlesHasPin = circlesInfo.some((col: any) => col.name === 'pin');
    if (!circlesHasPin && circlesInfo.length > 0) {
      database.exec("ALTER TABLE circles ADD COLUMN pin TEXT;");
      console.log("[db migration] Added pin column to circles");
    }
  } catch (e) {
    console.error("Migration error circles pin:", e);
  }

  try {
    const channelsInfo = database.pragma("table_info(channels)") as any[];
    const channelsHasPin = channelsInfo.some((col: any) => col.name === 'pin');
    if (!channelsHasPin && channelsInfo.length > 0) {
      database.exec("ALTER TABLE channels ADD COLUMN pin TEXT;");
      console.log("[db migration] Added pin column to channels");
    }
  } catch (e) {
    console.error("Migration error channels pin:", e);
  }

  try {
    const membersInfo = database.pragma("table_info(circle_members)") as any[];
    if (membersInfo.length > 0) {
      const currentOwnerCount = database.prepare("SELECT COUNT(*) as count FROM circle_members WHERE role = 'owner'").get() as any;
      const currentAdminCount = database.prepare("SELECT COUNT(*) as count FROM circle_members WHERE role = 'admin'").get() as any;
      if ((currentOwnerCount && currentOwnerCount.count > 0) || (currentAdminCount && currentAdminCount.count > 0)) {
        console.log("[db migration] Migrating circle_members role schema...");
        database.transaction(() => {
          database.exec(`
            CREATE TABLE IF NOT EXISTS circle_members_new (
              id TEXT PRIMARY KEY,
              circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id),
              role TEXT DEFAULT 'member' CHECK (role IN ('member','elder','co_admin','admin')),
              joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(circle_id, user_id)
            );
          `);
          database.exec(`
            INSERT OR IGNORE INTO circle_members_new (id, circle_id, user_id, role, joined_at)
            SELECT id, circle_id, user_id,
                   CASE WHEN role = 'owner' THEN 'admin'
                        WHEN role = 'admin' THEN 'co_admin'
                        ELSE 'member' END,
                   joined_at
            FROM circle_members;
          `);
          database.exec("DROP TABLE circle_members;");
          database.exec("ALTER TABLE circle_members_new RENAME TO circle_members;");
        })();
        console.log("[db migration] Recreated circle_members with new roles check constraint");
      }
    }
  } catch (e) {
    console.error("Migration error circle_members roles:", e);
  }

  const schema = getSchema()
  
  for (const statement of schema) {
    database.exec(statement)
  }

  // Ensure Guest User exists to satisfy foreign key constraints for unauthenticated clients
  database.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, role, points, created_at, updated_at)
    VALUES ('000000000000000000000000', 'guest@nextdoor.local', 'Guest User', 'guest_placeholder', 'user', 0, datetime('now'), datetime('now'))
  `).run()
}

function getSchema(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT 'User',
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','owner','admin')),
      locality_id TEXT,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS localities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      center_lat REAL,
      center_lng REAL,
      radius_km REAL DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      location_lat REAL,
      location_lng REAL,
      locality_id TEXT REFERENCES localities(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS post_upvotes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      tags TEXT DEFAULT '[]',
      description TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      whatsapp TEXT,
      hours TEXT DEFAULT '{}',
      photos TEXT DEFAULT '[]',
      attributes TEXT DEFAULT '{"parking":false,"cards":false,"homeDelivery":false}',
      owner_id TEXT REFERENCES users(id),
      verified INTEGER DEFAULT 0,
      verified_at DATETIME,
      plan TEXT DEFAULT 'free' CHECK (plan IN ('free','promoted')),
      rating_avg REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','suspended')),
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      locality_id TEXT REFERENCES localities(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS circles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator_id TEXT NOT NULL REFERENCES users(id),
      pin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS circle_members (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'member' CHECK (role IN ('member','elder','co_admin','admin')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(circle_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS circle_requests (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(circle_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
      pin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text' CHECK (type IN ('text','paste')),
      paste_id TEXT REFERENCES pastes(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      timings TEXT,
      contact TEXT,
      services TEXT DEFAULT '[]',
      description TEXT,
      photos TEXT DEFAULT '[]',
      city_id TEXT,
      location_lat REAL,
      location_lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS emergencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      location_lat REAL,
      location_lng REAL,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      text TEXT,
      owner_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      discount TEXT NOT NULL,
      code TEXT,
      valid_from DATETIME NOT NULL,
      valid_to DATETIME NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','disabled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      listing_id TEXT,
      user_id TEXT REFERENCES users(id),
      meta TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT,
      phone TEXT,
      city TEXT,
      position INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS pastes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      channel_id TEXT REFERENCES channels(id),
      society_id TEXT REFERENCES circles(id),
      title TEXT,
      content TEXT NOT NULL,
      language TEXT,
      filename TEXT,
      visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','unlisted','private','channel')),
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      content_size INTEGER,
      line_count INTEGER,
      view_count INTEGER DEFAULT 0,
      copy_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS paste_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paste_id TEXT NOT NULL REFERENCES pastes(id) ON DELETE CASCADE,
      viewer_id TEXT REFERENCES users(id),
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS paste_comments (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL REFERENCES pastes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS paste_reports (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL REFERENCES pastes(id) ON DELETE CASCADE,
      reporter_id TEXT REFERENCES users(id),
      anonymous_token TEXT,
      reason TEXT NOT NULL CHECK (reason IN ('spam','harassment','personal_info','malicious','illegal','copyright','other')),
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS business_claim_requests (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      requester_id TEXT NOT NULL REFERENCES users(id),
      private_contact_name TEXT,
      private_contact_phone TEXT,
      private_contact_email TEXT,
      verification_note TEXT,
      evidence_reference TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at DATETIME,
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS business_verification_events (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      admin_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS user_saved_places (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, business_id)
    )`,

    `CREATE TABLE IF NOT EXISTS rewari_articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      content_html TEXT,
      category TEXT NOT NULL CHECK (category IN ('history','heritage','places','services','businesses','events','future','guides')),
      locality TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','rejected','archived')),
      author_id TEXT NOT NULL REFERENCES users(id),
      reviewer_id TEXT REFERENCES users(id),
      source_reference TEXT,
      last_verified_at DATETIME,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS article_revisions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES rewari_articles(id) ON DELETE CASCADE,
      content_markdown TEXT NOT NULL,
      editor_id TEXT NOT NULL REFERENCES users(id),
      change_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_locality ON users(locality_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_locality ON posts(locality_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category)`,
    `CREATE INDEX IF NOT EXISTS idx_businesses_locality ON businesses(locality_id)`,
    `CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status)`,
    `CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(verified)`,
    `CREATE INDEX IF NOT EXISTS idx_circles_creator ON circles(creator_id)`,
    `CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id)`,
    `CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_channels_circle ON channels(circle_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_paste ON messages(paste_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_offers_business ON offers(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_offers_valid ON offers(valid_from, valid_to)`,
    `CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email)`,
    `CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_visibility ON pastes(visibility)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_owner ON pastes(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_channel ON pastes(channel_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_society ON pastes(society_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_language ON pastes(language)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_created ON pastes(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_pastes_expires ON pastes(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_paste_views_paste ON paste_views(paste_id)`,
    `CREATE INDEX IF NOT EXISTS idx_paste_comments_paste ON paste_comments(paste_id)`,
    `CREATE INDEX IF NOT EXISTS idx_paste_reports_paste ON paste_reports(paste_id)`,
    `CREATE INDEX IF NOT EXISTS idx_business_claims_business ON business_claim_requests(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_business_claims_requester ON business_claim_requests(requester_id)`,
    `CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claim_requests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_rewari_articles_slug ON rewari_articles(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_rewari_articles_category ON rewari_articles(category)`,
    `CREATE INDEX IF NOT EXISTS idx_rewari_articles_status ON rewari_articles(status)`,
    `CREATE INDEX IF NOT EXISTS idx_rewari_articles_author ON rewari_articles(author_id)`,
    `CREATE INDEX IF NOT EXISTS idx_article_revisions_article ON article_revisions(article_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_saved_places_user ON user_saved_places(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_saved_places_business ON user_saved_places(business_id)`
  ]
}