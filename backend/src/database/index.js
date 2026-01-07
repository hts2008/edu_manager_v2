import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(__dirname, '../../data/edumanager.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Get database instance
 */
export function getDb() {
  return db;
}

/**
 * Close database connection
 */
export function closeDb() {
  db.close();
}

/**
 * Run a query and return all results
 */
export function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

/**
 * Run a query and return first result
 */
export function queryOne(sql, params = []) {
  return db.prepare(sql).get(params);
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export function execute(sql, params = []) {
  return db.prepare(sql).run(params);
}

/**
 * Run multiple statements in a transaction
 */
export function transaction(fn) {
  return db.transaction(fn)();
}

export default db;
