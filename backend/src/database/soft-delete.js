import { execute, getDb } from './index.js';

const tables = ['students', 'parents', 'receipts', 'payments'];
let ensured = false;

function hasColumn(table, column) {
  return getDb()
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row.name === column);
}

export function ensureSoftDeleteColumns() {
  if (ensured) return;
  for (const table of tables) {
    if (!hasColumn(table, 'deleted_at')) {
      execute(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT`);
      execute(`CREATE INDEX IF NOT EXISTS idx_${table}_deleted ON ${table}(deleted_at)`);
    }
  }
  ensured = true;
}

export function activeWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  ensureSoftDeleteColumns();
  return `${prefix}deleted_at IS NULL`;
}
