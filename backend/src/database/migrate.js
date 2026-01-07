import { getDb } from './index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations
 */
export function migrate() {
  const db = getDb();
  
  console.log('🚀 Running database migrations...');
  
  // Read schema file
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Execute schema
  db.exec(schema);
  
  console.log('✅ Database schema created successfully!');
  console.log('📊 Tables created:');
  
  // List all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  tables.forEach(t => console.log(`   - ${t.name}`));
  
  console.log(`\n📈 Total: ${tables.length} tables`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
  process.exit(0);
}
