import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '../../data/pica.db');

// 确保数据目录存在 (仅当不是内存数据库时)
if (DB_PATH !== ':memory:') {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 创建数据库连接
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // 启用 WAL 模式提升性能

/**
 * 初始化数据库表结构
 */
export function initDatabase() {
  console.log('📦 初始化数据库...');

  // 漫画表
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      library_id INTEGER,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      cover_path TEXT,
      total_chapters INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_read_at DATETIME,
      is_favorite BOOLEAN DEFAULT 0,
      FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE SET NULL
    )
  `);

  // 章节表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      path TEXT NOT NULL,
      page_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
      UNIQUE(manga_id, chapter_number)
    )
  `);

  // 标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 漫画-标签关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga_tags (
      manga_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (manga_id, tag_id),
      FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // 阅读历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id INTEGER NOT NULL,
      chapter_id INTEGER,
      page_number INTEGER DEFAULT 1,
      progress REAL DEFAULT 0,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    )
  `);

  // 书库表（多书库支持）
  db.exec(`
    CREATE TABLE IF NOT EXISTS libraries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PIN 会话表（存储 token 与过期时间）
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      expires_at DATETIME NOT NULL
    )
  `);

  // 评分表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id INTEGER NOT NULL,
      rating REAL NOT NULL CHECK(rating >= 0 AND rating <= 10),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE
    )
  `);

  // 数据库迁移：确保旧数据表包含新字段 (防止因缺少字段导致索引创建失败)
  try { db.exec('ALTER TABLE manga ADD COLUMN library_id INTEGER REFERENCES libraries(id) ON DELETE SET NULL'); } catch (e) { }
  try { db.exec('ALTER TABLE manga ADD COLUMN is_favorite BOOLEAN DEFAULT 0'); } catch (e) { }
  try { db.exec('ALTER TABLE manga ADD COLUMN rating REAL DEFAULT 0'); } catch (e) { }
  try { db.exec('ALTER TABLE manga ADD COLUMN rating_count INTEGER DEFAULT 0'); } catch (e) { }

  // 创建索引以提升查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_manga_title ON manga(title);
    CREATE INDEX IF NOT EXISTS idx_manga_favorite ON manga(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_manga_library_id ON manga(library_id);
    CREATE INDEX IF NOT EXISTS idx_manga_rating ON manga(rating);
    CREATE INDEX IF NOT EXISTS idx_chapters_manga_id ON chapters(manga_id);
    CREATE INDEX IF NOT EXISTS idx_manga_tags_manga_id ON manga_tags(manga_id);
    CREATE INDEX IF NOT EXISTS idx_manga_tags_tag_id ON manga_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_reading_history_manga_id ON reading_history(manga_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_manga_id ON ratings(manga_id);
  `);

  console.log('✅ 数据库初始化完成');
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  db.close();
  console.log('🔒 数据库连接已关闭');
}
