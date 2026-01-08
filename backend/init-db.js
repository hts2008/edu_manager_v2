// Complete database initialization script
import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('./data/edu_manager.db');

console.log('🔄 Initializing complete database schema...');

// Create all required tables
db.exec(`
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- PARENTS TABLE
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    parent_id TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    enrollment_date TEXT NOT NULL,
    graduation_date TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- TEACHERS TABLE
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    salary_type TEXT NOT NULL CHECK (salary_type IN ('hourly', 'fixed')),
    salary_amount REAL NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- CLASSES TABLE
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    schedule_days TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    fee_per_day REAL NOT NULL,
    max_students INTEGER DEFAULT 50,
    teacher_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- STUDENT_CLASSES TABLE
CREATE TABLE IF NOT EXISTS student_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    enrollment_date TEXT NOT NULL,
    fee_per_day_snapshot REAL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(student_id, class_id)
);

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent_with_fee', 'absent_no_fee')),
    reason TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(student_id, class_id, attendance_date)
);

-- ATTENDANCE_PERIODS TABLE
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
);

-- MONTHLY_FEES TABLE
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
);

-- TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
    paper_size TEXT NOT NULL CHECK (paper_size IN ('a4', 'a5', 'letter', 'thermal_80mm')),
    orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
    json_config TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    month TEXT NOT NULL,
    days_count INTEGER NOT NULL,
    fee_per_day REAL NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    template_id TEXT NOT NULL,
    notes TEXT,
    pdf_path TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('salary', 'utility', 'office', 'other')),
    amount REAL NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT,
    template_id TEXT NOT NULL,
    notes TEXT,
    pdf_path TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- CENTER_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS center_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    center_name TEXT NOT NULL DEFAULT 'Trung Tâm Dạy Thêm',
    center_address TEXT,
    center_phone TEXT,
    center_email TEXT,
    center_logo TEXT,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

INSERT OR IGNORE INTO center_settings (id, center_name) VALUES (1, 'Trung Tâm Dạy Thêm');
`);

console.log('✅ All tables created successfully');

// Create indexes
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_periods_class ON attendance_periods(class_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_periods_month ON attendance_periods(period_month);
    CREATE INDEX IF NOT EXISTS idx_monthly_fees_student ON monthly_fees(student_id);
  `);
  console.log('✅ Indexes created');
} catch (e) {
  console.log('Indexes may already exist:', e.message);
}

// Verify tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n📋 Tables in database:');
tables.forEach(t => console.log('  - ' + t.name));

db.close();
console.log('\n✅ Database initialization complete!');
