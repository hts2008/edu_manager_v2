-- ========================================
-- EDU MANAGER - MIGRATION V2
-- BUG-2026-01-07-001: Design Flaws Fix
-- ========================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ========================================
-- PART 1: STUDENT-CLASS RELATIONSHIP FIX
-- Add end_date and fee snapshot to track class changes
-- ========================================

-- Add end_date column to track when enrollment ended
ALTER TABLE student_classes ADD COLUMN end_date TEXT;

-- Add fee_per_day_snapshot to freeze fee at enrollment time
ALTER TABLE student_classes ADD COLUMN fee_per_day_snapshot REAL;

-- Add notes for class change reason
ALTER TABLE student_classes ADD COLUMN notes TEXT;

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_sc_date_range ON student_classes(enrollment_date, end_date);

-- Backfill: Copy current fee from classes for existing enrollments
UPDATE student_classes 
SET fee_per_day_snapshot = (
  SELECT fee_per_day FROM classes WHERE id = student_classes.class_id
)
WHERE fee_per_day_snapshot IS NULL;

-- ========================================
-- PART 2: ATTENDANCE PERIODS TABLE
-- SAP Timesheet-style lock mechanism
-- ========================================

CREATE TABLE IF NOT EXISTS attendance_periods (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM format
  status TEXT NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open', 'submitted', 'approved', 'locked')),
  
  -- Workflow tracking
  total_sessions INTEGER DEFAULT 0,
  total_present INTEGER DEFAULT 0,
  total_absent_fee INTEGER DEFAULT 0,
  total_absent_no_fee INTEGER DEFAULT 0,
  
  -- Audit trail
  submitted_by TEXT,
  submitted_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  locked_by TEXT,
  locked_at TEXT,
  
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (locked_by) REFERENCES users(id),
  UNIQUE(class_id, month)
);

CREATE INDEX IF NOT EXISTS idx_ap_class ON attendance_periods(class_id);
CREATE INDEX IF NOT EXISTS idx_ap_month ON attendance_periods(month);
CREATE INDEX IF NOT EXISTS idx_ap_status ON attendance_periods(status);

-- ========================================
-- PART 3: ATTENDANCE TABLE UPDATES
-- Add period link and makeup support
-- ========================================

-- Add period reference
ALTER TABLE attendance ADD COLUMN period_id TEXT REFERENCES attendance_periods(id);

-- Add makeup class support
ALTER TABLE attendance ADD COLUMN is_makeup INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN makeup_for_date TEXT;

-- Create index for period queries
CREATE INDEX IF NOT EXISTS idx_att_period ON attendance(period_id);

-- ========================================
-- PART 4: MONTHLY FEES TABLE
-- Fee status tracking per student per month
-- ========================================

CREATE TABLE IF NOT EXISTS monthly_fees (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM format
  
  -- Fee status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'confirmed', 'paid')),
  
  -- Calculated fields (frozen when ready)
  total_days INTEGER DEFAULT 0,
  total_amount REAL DEFAULT 0,
  breakdown TEXT, -- JSON array of class breakdown
  
  -- Workflow tracking
  ready_at TEXT,
  ready_by TEXT,
  confirmed_at TEXT,
  confirmed_by TEXT,
  paid_at TEXT,
  paid_by TEXT,
  
  -- Payment details (filled when paid)
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
  receipt_id TEXT,
  notes TEXT,
  
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id),
  FOREIGN KEY (ready_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id),
  FOREIGN KEY (paid_by) REFERENCES users(id),
  UNIQUE(student_id, month)
);

CREATE INDEX IF NOT EXISTS idx_mf_student ON monthly_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_mf_month ON monthly_fees(month);
CREATE INDEX IF NOT EXISTS idx_mf_status ON monthly_fees(status);

-- ========================================
-- PART 5: RECEIPTS TABLE UPDATE
-- Link to monthly_fees
-- ========================================

ALTER TABLE receipts ADD COLUMN monthly_fee_id TEXT REFERENCES monthly_fees(id);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
