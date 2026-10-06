import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCipheriv,createHash} from 'node:crypto';
import {BUSINESS_TABLES, PROTECTED_TABLES, validateResetSchema, truncateBusinessSql, authenticateBackup,assertFreshBackup,assertResetResult,assertRehearsal,clearBusinessData} from '../scripts/production-business-reset-core.js';

test('reset classification preserves auth/config/templates and explicitly clears every business table',()=>{
  const tables=[...BUSINESS_TABLES,...PROTECTED_TABLES];
  assert.equal(tables.length,35);assert.equal(new Set(tables).size,35);
  validateResetSchema(tables);
  for(const table of ['users','tenants','templates','center_settings','role_permissions','auth_rate_limit','_prisma_migrations']) {
    assert.ok(PROTECTED_TABLES.includes(table));assert.ok(!BUSINESS_TABLES.includes(table));
  }
  for(const table of ['parents','students','teachers','classes','attendance','receipts','payments','student_progress_months','activity_logs','auth_sessions']) assert.ok(BUSINESS_TABLES.includes(table));
});
test('unknown or missing schema table fails closed before destructive SQL',()=>{
  assert.throws(()=>validateResetSchema([...BUSINESS_TABLES,...PROTECTED_TABLES,'new_table']),/schema/);
  assert.throws(()=>validateResetSchema([...BUSINESS_TABLES]),/schema/);
});
test('truncate is explicit, transactional sequence restart and RESTRICT, never CASCADE or protected tables',()=>{
  const sql=truncateBusinessSql();
  assert.match(sql,/RESTART IDENTITY RESTRICT$/);assert.doesNotMatch(sql,/CASCADE/);
  for(const table of PROTECTED_TABLES) assert.ok(!sql.includes(`"${table}"`));
  assert.equal((sql.match(/public\."/g)||[]).length,BUSINESS_TABLES.length);
  assert.equal((sql.match(/ONLY public/g)||[]).length,BUSINESS_TABLES.length);
});
const inventory=()=>Object.fromEntries([...BUSINESS_TABLES,...PROTECTED_TABLES].map(table=>[table,{count:0,checksum:'empty'}]));
test('actual encrypted backup rejects corrupted ciphertext, checksum and byte length',()=>{
  const key=Buffer.alloc(32,1),iv=Buffer.alloc(12,2),clear=Buffer.from('verified recovery');
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const bytes=Buffer.concat([cipher.update(clear),cipher.final()]);
  const envelope={algorithm:'aes-256-gcm',iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),ciphertext:bytes.toString('base64')};
  const proof={checksum:createHash('sha256').update(clear).digest('hex'),bytes:clear.length};
  authenticateBackup(envelope,key,proof);
  assert.throws(()=>authenticateBackup({...envelope,ciphertext:Buffer.alloc(bytes.length).toString('base64')},key,proof));
  assert.throws(()=>authenticateBackup(envelope,key,{...proof,checksum:'wrong'}));
  assert.throws(()=>authenticateBackup(envelope,key,{...proof,bytes:0}));
});
test('freshness rejects future, invalid and expired backup timestamps',()=>{
  const now=Date.now();assertFreshBackup(new Date(now-1000).toISOString(),now);
  for(const at of ['invalid',new Date(now+1).toISOString(),new Date(now-1800000).toISOString()]) assert.throws(()=>assertFreshBackup(at,now));
});
test('verification rejects nonempty business data or changed protected content',()=>{
  const before=inventory();assertResetResult(before,before);
  assert.throws(()=>assertResetResult(before,{...before,students:{count:1,checksum:'changed'}}));
  assert.throws(()=>assertResetResult(before,{...before,users:{count:0,checksum:'changed'}}));
});
test('rehearsal proof requires exact implementation, backup, inventories and rollback',()=>{
  const before=inventory();const proof={mode:'rehearsal',backup:'backup',backupChecksum:'sum',implementationDigest:'code',rollbackVerified:true,before,after:before,clearedTables:25,protectedTables:10};
  assertRehearsal(proof,before,'backup','sum','code');
  for(const patch of [{mode:'production'},{implementationDigest:'old'},{rollbackVerified:false},{before:{}},{after:{...before,receipts:{count:1,checksum:'bad'}}}]) assert.throws(()=>assertRehearsal({...proof,...patch},before,'backup','sum','code'));
});
test('structural drift refuses truncation before any destructive SQL',async()=>{
  const statements:string[]=[];
  const tx={$executeRawUnsafe:async(sql:string)=>{statements.push(sql);return 0;},$queryRawUnsafe:async()=>[{count:1n}]};
  const db={$transaction:async(callback:any)=>callback(tx)};
  await assert.rejects(clearBusinessData(db as any,inventory()),/inheritance/);
  assert.ok(statements.every(sql=>!sql.startsWith('TRUNCATE')));
});
