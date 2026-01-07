// Migration runner for BUG-2026-01-07-001
import { getDb } from '../index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runMigration = () => {
  console.log('\n========================================');
  console.log('EDU MANAGER - Migration V2');
  console.log('BUG-2026-01-07-001: Design Flaws Fix');
  console.log('========================================\n');

  const db = getDb();
  
  try {
    // Check if migration already applied - look for attendance_periods table
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_periods'").all();
    const hasMonthlyFees = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_fees'").all();
    
    if (tables.length > 0 && hasMonthlyFees.length > 0) {
      console.log('✅ Migration already applied (attendance_periods and monthly_fees exist)');
      return;
    }

    console.log('🔄 Running migration...\n');

    // Part 1: Student Classes
    console.log('1. Updating student_classes table...');
    db.exec(`
      ALTER TABLE student_classes ADD COLUMN end_date TEXT;
      ALTER TABLE student_classes ADD COLUMN fee_per_day_snapshot REAL;
      ALTER TABLE student_classes ADD COLUMN notes TEXT;
    `);
    console.log('   ✅ Added end_date, fee_per_day_snapshot, notes');

    // Backfill fee snapshot
    db.exec(`
      UPDATE student_classes 
      SET fee_per_day_snapshot = (
        SELECT fee_per_day FROM classes WHERE id = student_classes.class_id
      )
      WHERE fee_per_day_snapshot IS NULL;
    `);
    console.log('   ✅ Backfilled fee_per_day_snapshot');

    // Part 2: Attendance Periods
    console.log('\n2. Creating attendance_periods table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS attendance_periods (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        period_month TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' 
          CHECK (status IN ('open', 'submitted', 'approved', 'locked')),
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
      CREATE INDEX IF NOT EXISTS idx_ap_class ON attendance_periods(class_id);
      CREATE INDEX IF NOT EXISTS idx_ap_month ON attendance_periods(period_month);
    `);
    console.log('   ✅ Created attendance_periods table');

    // Part 3: Update Attendance
    console.log('\n3. Updating attendance table...');
    db.exec(`
      ALTER TABLE attendance ADD COLUMN period_id TEXT;
      ALTER TABLE attendance ADD COLUMN is_makeup INTEGER DEFAULT 0;
      ALTER TABLE attendance ADD COLUMN makeup_for_date TEXT;
    `);
    console.log('   ✅ Added period_id, is_makeup, makeup_for_date');

    // Part 4: Monthly Fees
    console.log('\n4. Creating monthly_fees table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_fees (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        month TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'ready', 'confirmed', 'paid')),
        total_days INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        breakdown TEXT,
        ready_at TEXT,
        ready_by TEXT,
        confirmed_at TEXT,
        confirmed_by TEXT,
        paid_at TEXT,
        paid_by TEXT,
        payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
        receipt_id TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (student_id) REFERENCES students(id),
        UNIQUE(student_id, month)
      );
      CREATE INDEX IF NOT EXISTS idx_mf_student ON monthly_fees(student_id);
      CREATE INDEX IF NOT EXISTS idx_mf_month ON monthly_fees(month);
      CREATE INDEX IF NOT EXISTS idx_mf_status ON monthly_fees(status);
    `);
    console.log('   ✅ Created monthly_fees table');

    // Part 5: Update Receipts
    console.log('\n5. Updating receipts table...');
    try {
      db.exec(`ALTER TABLE receipts ADD COLUMN monthly_fee_id TEXT;`);
      console.log('   ✅ Added monthly_fee_id');
    } catch (e) {
      console.log('   ⚠️ monthly_fee_id already exists (skipped)');
    }

    console.log('\n========================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
