// Migration script to add attendance_periods and monthly_fees tables
import Database from 'better-sqlite3';

const db = new Database('./data/edu_manager.db');

console.log('Running migrations...');

// Create attendance_periods table
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance_periods (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    period_month TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'approved', 'locked')),
    total_sessions INTEGER DEFAULT 0,
    total_present INTEGER DEFAULT 0,
    total_absent_fee INTEGER DEFAULT 0,
    total_absent_no_fee INTEGER DEFAULT 0,
    submitted_by TEXT,
    submitted_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    locked_by TEXT,
    locked_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(class_id, period_month)
  )
`);
console.log('✅ attendance_periods table created');

// Create monthly_fees table
db.exec(`
  CREATE TABLE IF NOT EXISTS monthly_fees (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    month TEXT NOT NULL,
    total_days INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'confirmed', 'paid')),
    receipt_id TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(student_id, month)
  )
`);
console.log('✅ monthly_fees table created');

// Create indexes
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_periods_class ON attendance_periods(class_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_periods_month ON attendance_periods(period_month)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_periods_status ON attendance_periods(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_monthly_fees_student ON monthly_fees(student_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_monthly_fees_month ON monthly_fees(month)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_monthly_fees_status ON monthly_fees(status)');
  console.log('✅ Indexes created');
} catch (e) {
  console.log('Indexes might already exist:', e.message);
}

console.log('✅ Migration complete!');
db.close();
