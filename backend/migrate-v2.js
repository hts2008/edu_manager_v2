// Migration script to fix attendance_periods and related tables
import Database from "better-sqlite3";

const db = new Database("./data/edumanager.db");

console.log("🔄 Migrating attendance_periods table...\n");

// Check current schema
const currentSchema = db.pragma("table_info(attendance_periods)");
console.log("Current schema:");
currentSchema.forEach((col) => console.log(`  - ${col.name}: ${col.type}`));

// Check if we need to migrate (id should be TEXT, not INTEGER)
const idCol = currentSchema.find((c) => c.name === "id");
if (idCol && idCol.type === "INTEGER") {
  console.log("\n⚠️ Found INTEGER id - need to recreate table with TEXT id\n");

  // Backup existing data
  const existingData = db.prepare("SELECT * FROM attendance_periods").all();
  console.log(`Backing up ${existingData.length} existing records...`);

  // Drop old table
  db.exec("DROP TABLE IF EXISTS attendance_periods_old");
  db.exec("ALTER TABLE attendance_periods RENAME TO attendance_periods_old");

  // Create new table with correct schema
  db.exec(`
    CREATE TABLE attendance_periods (
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
    
    CREATE INDEX IF NOT EXISTS idx_attendance_periods_class ON attendance_periods(class_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_periods_month ON attendance_periods(period_month);
  `);

  console.log("✅ Created new attendance_periods table with TEXT id");

  // Migrate existing data if any
  if (existingData.length > 0) {
    const insertStmt = db.prepare(`
      INSERT INTO attendance_periods (id, class_id, period_month, status, total_sessions, total_present, total_absent_fee, total_absent_no_fee, submitted_by, submitted_at, locked_by, locked_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    existingData.forEach((row) => {
      const newId = `AP${row.period_month.replace("-", "")}${row.class_id.slice(
        -4
      )}`;
      const status = row.status === "draft" ? "open" : row.status;
      insertStmt.run(
        newId,
        row.class_id,
        row.period_month,
        status,
        row.total_sessions || 0,
        row.attended_count || 0,
        row.absent_with_fee_count || 0,
        row.absent_no_fee_count || 0,
        row.submitted_by,
        row.submitted_at,
        row.locked_by,
        row.locked_at,
        row.created_at,
        row.updated_at
      );
    });
    console.log(`✅ Migrated ${existingData.length} records`);
  }

  // Drop backup table
  db.exec("DROP TABLE IF EXISTS attendance_periods_old");
} else {
  console.log("\n✅ Table already has correct schema (TEXT id)");
}

// Verify new schema
console.log("\nNew schema:");
const newSchema = db.pragma("table_info(attendance_periods)");
newSchema.forEach((col) => console.log(`  - ${col.name}: ${col.type}`));

// Also ensure monthly_fees table exists
console.log("\n🔄 Checking monthly_fees table...");
const monthlyFeesTables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_fees'"
  )
  .get();
if (!monthlyFeesTables) {
  console.log("Creating monthly_fees table...");
  db.exec(`
    CREATE TABLE monthly_fees (
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
    
    CREATE INDEX IF NOT EXISTS idx_monthly_fees_student ON monthly_fees(student_id);
  `);
  console.log("✅ Created monthly_fees table");
} else {
  console.log("✅ monthly_fees table already exists");
}

db.close();
console.log("\n✅ Migration complete!");
