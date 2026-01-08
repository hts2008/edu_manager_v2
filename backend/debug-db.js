import Database from "better-sqlite3";

const db = new Database("./data/edumanager.db");

console.log("=== DATABASE STATUS ===\n");

// List all tables
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
console.log("Tables:", tables.map((t) => t.name).join(", "));
console.log("\n");

// Check attendance_periods schema
console.log("=== attendance_periods schema ===");
try {
  const schema = db.pragma("table_info(attendance_periods)");
  console.table(schema);
} catch (e) {
  console.log("Error:", e.message);
}

// Check attendance table schema
console.log("\n=== attendance schema ===");
try {
  const schema = db.pragma("table_info(attendance)");
  console.table(schema);
} catch (e) {
  console.log("Error:", e.message);
}

// Check sample data in attendance table
console.log("\n=== Sample attendance records ===");
try {
  const records = db.prepare("SELECT * FROM attendance LIMIT 5").all();
  console.log(
    "Records count:",
    db.prepare("SELECT COUNT(*) as c FROM attendance").get().c
  );
  console.table(records);
} catch (e) {
  console.log("Error:", e.message);
}

// Check sample data in attendance_periods table
console.log("\n=== Sample attendance_periods records ===");
try {
  const records = db.prepare("SELECT * FROM attendance_periods LIMIT 5").all();
  console.log(
    "Records count:",
    db.prepare("SELECT COUNT(*) as c FROM attendance_periods").get().c
  );
  console.table(records);
} catch (e) {
  console.log("Error:", e.message);
}

db.close();
