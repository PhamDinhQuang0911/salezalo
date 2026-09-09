import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Determine database path
const dataDir = process.env.DATABASE_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "zalo_manager.db");

// Singleton connection
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
    // Enable foreign keys and WAL mode for maximum performance and concurrency
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    initSchema(dbInstance);
  }
  return dbInstance;
}

function safeAddColumn(db: DatabaseSync, tableName: string, columnDef: string) {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef};`);
  } catch (err) {
    // Column already exists, safe to ignore
  }
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      scrape_webhook_url TEXT NOT NULL,
      send_webhook_url TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active' | 'paused'
      total_scraped_groups INTEGER DEFAULT 0,
      total_sent_messages INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator_id TEXT DEFAULT '',
      admin_ids TEXT DEFAULT '[]',
      avatar TEXT DEFAULT '',
      full_avatar TEXT DEFAULT '',
      total_member INTEGER DEFAULT 0,
      filtered_member_count INTEGER DEFAULT 0,
      admin_count INTEGER DEFAULT 0,
      invite_link TEXT DEFAULT '',
      account_phone TEXT DEFAULT '',
      status TEXT DEFAULT 'completed',
      last_scraped_at TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zalo_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      zalo_name TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      account_status INTEGER DEFAULT 0,
      global_id TEXT DEFAULT '',
      is_admin INTEGER DEFAULT 0,
      role TEXT DEFAULT 'member', -- 'creator' | 'admin' | 'member'
      phone TEXT DEFAULT '',
      is_friend INTEGER DEFAULT 0, -- 0: chưa kết bạn, 1: đã là bạn bè, 2: đã gửi lời mời
      block_stranger_msg INTEGER DEFAULT 0, -- 0: nhận tin bình thường, 1: chặn tin nhắn người lạ
      campaign_sent_count INTEGER DEFAULT 0,
      last_campaign_sent_at TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (group_id, member_id),
      FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(zalo_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message_template TEXT NOT NULL,
      target_group_id TEXT DEFAULT '', -- empty for all groups
      account_phone TEXT DEFAULT '', -- SĐT Zalo thực hiện gửi
      target_count INTEGER DEFAULT 0,
      max_recipients INTEGER DEFAULT 100, -- giới hạn số người gửi đợt này
      cooldown_days INTEGER DEFAULT 10, -- loại bỏ người đã nhận tin trong X ngày
      auto_friend_first INTEGER DEFAULT 0, -- 1: kết bạn trước khi gửi
      delay_seconds INTEGER DEFAULT 15, -- giãn cách giữa các tin
      image_url TEXT DEFAULT '', -- link ảnh đính kèm
      video_url TEXT DEFAULT '', -- link video đính kèm
      cta_link TEXT DEFAULT '', -- link web CTA
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft', -- 'draft' | 'sending' | 'completed' | 'failed'
      n8n_response TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Run migrations safely for existing databases
  safeAddColumn(db, "groups", "account_phone TEXT DEFAULT ''");
  safeAddColumn(db, "members", "is_friend INTEGER DEFAULT 0");
  safeAddColumn(db, "members", "block_stranger_msg INTEGER DEFAULT 0");
  safeAddColumn(db, "members", "campaign_sent_count INTEGER DEFAULT 0");
  safeAddColumn(db, "members", "last_campaign_sent_at TEXT DEFAULT ''");
  safeAddColumn(db, "campaigns", "account_phone TEXT DEFAULT ''");
  safeAddColumn(db, "campaigns", "max_recipients INTEGER DEFAULT 100");
  safeAddColumn(db, "campaigns", "cooldown_days INTEGER DEFAULT 10");
  safeAddColumn(db, "campaigns", "auto_friend_first INTEGER DEFAULT 0");
  safeAddColumn(db, "campaigns", "delay_seconds INTEGER DEFAULT 15");
  safeAddColumn(db, "campaigns", "image_url TEXT DEFAULT ''");
  safeAddColumn(db, "campaigns", "video_url TEXT DEFAULT ''");
  safeAddColumn(db, "campaigns", "cta_link TEXT DEFAULT ''");

  // Create indexes safely after columns exist
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_members_is_admin ON members(is_admin);
      CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
      CREATE INDEX IF NOT EXISTS idx_members_is_friend ON members(is_friend);
      CREATE INDEX IF NOT EXISTS idx_members_block_stranger ON members(block_stranger_msg);
      CREATE INDEX IF NOT EXISTS idx_members_last_sent ON members(last_campaign_sent_at);
      CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);
    `);
  } catch (idxErr) {
    // safe to ignore index error
  }

  // Initialize default settings if empty
  const defaultSettings = [
    { key: "n8n_scrape_webhook", value: "https://your-n8n-instance.com/webhook/zalo-scrape" },
    { key: "n8n_send_webhook", value: "https://your-n8n-instance.com/webhook/zalo-send-message" },
    { key: "webhook_secret", value: "zalo_sec_2026_marketing" },
    { key: "auto_deduplicate", value: "true" },
  ];

  for (const s of defaultSettings) {
    const existing = db.prepare("SELECT key FROM settings WHERE key = ?").get(s.key);
    if (!existing) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(s.key, s.value);
    }
  }
}
