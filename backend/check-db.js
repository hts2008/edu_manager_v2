// Check database table structure
import Database from 'better-sqlite3';

const db = new Database('./data/edu_manager.db');

console.log('=== attendance_periods table ===');
const periodsCols = db.prepare("PRAGMA table_info(attendance_periods)").all();
console.log(periodsCols.map(c => `${c.name} (${c.type})`).join('\n'));

console.log('\n=== attendance table ===');
const attCols = db.prepare("PRAGMA table_info(attendance)").all();
console.log(attCols.map(c => `${c.name} (${c.type})`).join('\n'));

console.log('\n=== Sample attendance records ===');
const attRecords = db.prepare("SELECT * FROM attendance LIMIT 5").all();
console.log(attRecords);

console.log('\n=== Sample attendance_periods records ===');
const periodRecords = db.prepare("SELECT * FROM attendance_periods LIMIT 5").all();
console.log(periodRecords);

db.close();
