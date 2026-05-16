-- ========================================
-- EDU MANAGER - DATABASE SCHEMA
-- SQLite 3.x
-- Created: 2026-01-07
-- ========================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ========================================
-- USERS TABLE (Authentication)
-- ========================================
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

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ========================================
-- PARENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    deleted_at TEXT
);

CREATE INDEX idx_parents_phone ON parents(phone);
CREATE INDEX idx_parents_name ON parents(full_name);
CREATE INDEX idx_parents_deleted ON parents(deleted_at);

-- ========================================
-- STUDENTS TABLE
-- ========================================
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
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    deleted_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES parents(id)
);

CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_name ON students(full_name);
CREATE INDEX idx_students_deleted ON students(deleted_at);

-- ========================================
-- TEACHERS TABLE
-- ========================================
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

CREATE INDEX idx_teachers_phone ON teachers(phone);
CREATE INDEX idx_teachers_status ON teachers(status);

-- ========================================
-- CLASSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    schedule_days TEXT NOT NULL, -- JSON: [1,3,5] = Mon, Wed, Fri
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    fee_per_day REAL NOT NULL,
    max_students INTEGER DEFAULT 50,
    teacher_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);

-- ========================================
-- STUDENT_CLASSES (Many-to-Many Link)
-- ========================================
CREATE TABLE IF NOT EXISTS student_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    enrollment_date TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(student_id, class_id)
);

CREATE INDEX idx_student_classes_student ON student_classes(student_id);
CREATE INDEX idx_student_classes_class ON student_classes(class_id);

-- ========================================
-- ATTENDANCE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent_with_fee', 'absent_no_fee')),
    reason TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(student_id, class_id, attendance_date)
);


CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);

-- ========================================
-- ATTENDANCE_PERIODS TABLE (SAP Timesheet)
-- ========================================
CREATE TABLE IF NOT EXISTS attendance_periods (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    period_month TEXT NOT NULL, -- YYYY-MM format
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
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(class_id, period_month)
);

CREATE INDEX idx_attendance_periods_class ON attendance_periods(class_id);
CREATE INDEX idx_attendance_periods_month ON attendance_periods(period_month);
CREATE INDEX idx_attendance_periods_status ON attendance_periods(status);

-- ========================================
-- MONTHLY_FEES TABLE (Fee Collection)
-- ========================================
CREATE TABLE IF NOT EXISTS monthly_fees (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM format
    total_days INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'confirmed', 'paid')),
    receipt_id TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (receipt_id) REFERENCES receipts(id),
    UNIQUE(student_id, month)
);

CREATE INDEX idx_monthly_fees_student ON monthly_fees(student_id);
CREATE INDEX idx_monthly_fees_month ON monthly_fees(month);
CREATE INDEX idx_monthly_fees_status ON monthly_fees(status);

-- ========================================
-- TEMPLATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
    paper_size TEXT NOT NULL CHECK (paper_size IN ('a4', 'a5', 'letter', 'thermal_80mm')),
    orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
    json_config TEXT NOT NULL, -- Full canvas configuration
    is_default INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_default ON templates(is_default);

-- ========================================
-- RECEIPTS TABLE (Phiếu Thu)
-- ========================================
CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM format
    days_count INTEGER NOT NULL,
    fee_per_day REAL NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    template_id TEXT NOT NULL,
    notes TEXT,
    pdf_path TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    deleted_at TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_receipts_student ON receipts(student_id);
CREATE INDEX idx_receipts_month ON receipts(month);
CREATE INDEX idx_receipts_created ON receipts(created_at);
CREATE INDEX idx_receipts_deleted ON receipts(deleted_at);

-- ========================================
-- PAYMENTS TABLE (Phiếu Chi)
-- ========================================
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    deleted_at TEXT,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_payments_category ON payments(category);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_deleted ON payments(deleted_at);

-- ========================================
-- ACTIVITY_LOGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_created ON activity_logs(created_at);

-- ========================================
-- CENTER_SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS center_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton table
    center_name TEXT NOT NULL DEFAULT 'Trung Tâm Dạy Thêm',
    center_address TEXT,
    center_phone TEXT,
    center_email TEXT,
    center_logo TEXT, -- Path to logo file
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Insert default center settings
INSERT OR IGNORE INTO center_settings (id, center_name) VALUES (1, 'Trung Tâm Dạy Thêm');
