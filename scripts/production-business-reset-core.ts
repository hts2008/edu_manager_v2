import assert from 'node:assert/strict';
import type {PrismaClient, Prisma} from '@prisma/client';
import {createDecipheriv,createHash} from 'node:crypto';

export const BUSINESS_TABLES: readonly string[] = [
  'activity_logs','attendance','attendance_periods','auth_sessions',
  'bulk_fee_payment_batches','bulk_fee_payment_items','class_month_plan_revisions',
  'class_month_plans','class_sessions','classes','enrollment_periods',
  'monthly_fee_line_revisions','monthly_fee_lines','monthly_fees','parents',
  'payments','receipt_lines','receipts','student_classes','student_progress_daily_entries',
  'student_progress_months','student_progress_revisions','student_progress_skills','students','teachers',
];
export const PROTECTED_TABLES: readonly string[] = [
  '_prisma_migrations','auth_rate_limit','center_settings','integration_configs',
  'role_permissions','setting_revisions','setting_values','templates','tenants','users',
];
export type Inventory = Record<string,{count:number;checksum:string}>;
export function validateResetSchema(tables:string[]) {
  assert.deepEqual([...tables].sort(),[...BUSINESS_TABLES,...PROTECTED_TABLES].sort(),'Unexpected reset schema; destructive operation refused');
}
export function truncateBusinessSql() {
  return `TRUNCATE TABLE ${BUSINESS_TABLES.map(table=>`ONLY public."${table}"`).join(', ')} RESTART IDENTITY RESTRICT`;
}
export function assertFreshBackup(at:string,now=Date.now()) {
  const age=now-Date.parse(at);
  assert.ok(Number.isFinite(age)&&age>=0&&age<30*60_000,'Fresh verified backup required');
}
export function authenticateBackup(envelope:any,key:Buffer,proof:{checksum:string;bytes:number}) {
  assert.equal(envelope.algorithm,'aes-256-gcm');
  let clear:Buffer|undefined;
  try {
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'hex'));
    decipher.setAuthTag(Buffer.from(envelope.tag,'hex'));
    clear=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
    assert.equal(createHash('sha256').update(clear).digest('hex'),proof.checksum);
    assert.equal(clear.length,proof.bytes);
  } finally {clear?.fill(0);}
}
export function assertResetResult(before:Inventory,after:Inventory) {
  validateResetSchema(Object.keys(before));validateResetSchema(Object.keys(after));
  for(const table of PROTECTED_TABLES) assert.deepEqual(after[table],before[table],`Protected table changed: ${table}`);
  for(const table of BUSINESS_TABLES) assert.equal(after[table].count,0,`Business table not empty: ${table}`);
}
export function assertRehearsal(proof:any,expected:Inventory,backup:string,checksum:string,digest:string) {
  assert.equal(proof.mode,'rehearsal');assert.equal(proof.backup,backup);assert.equal(proof.backupChecksum,checksum);
  assert.equal(proof.implementationDigest,digest);assert.equal(proof.rollbackVerified,true);
  assert.deepEqual(proof.before,expected);assertResetResult(proof.before,proof.after);
  assert.equal(proof.clearedTables,25);assert.equal(proof.protectedTables,10);
}
async function assertResetStructure(tx:Prisma.TransactionClient) {
  const inheritance=await tx.$queryRawUnsafe<Array<{count:bigint}>>(`SELECT count(*) FROM pg_inherits i
    JOIN pg_class c ON c.oid=i.inhrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_class p ON p.oid=i.inhparent JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE n.nspname='public' OR pn.nspname='public'`);
  assert.equal(Number(inheritance[0].count),0,'Unexpected inheritance/partition structure');
  const kinds=await tx.$queryRawUnsafe<Array<{count:bigint}>>("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('p','f')");
  assert.equal(Number(kinds[0].count),0,'Unexpected partition or foreign table');
  const triggers=await tx.$queryRawUnsafe<Array<{count:bigint}>>("SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND (t.tgtype & 32)=32 AND t.tgname<>'edu_release_write_freeze'");
  assert.equal(Number(triggers[0].count),0,'Unexpected TRUNCATE trigger');
  const foreign=await tx.$queryRawUnsafe<Array<{dependent:string;target:string}>>(`SELECT dn.nspname||'.'||d.relname AS dependent, pn.nspname||'.'||p.relname AS target
    FROM pg_constraint f JOIN pg_class d ON d.oid=f.conrelid JOIN pg_namespace dn ON dn.oid=d.relnamespace
    JOIN pg_class p ON p.oid=f.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE f.contype='f' AND pn.nspname='public'`);
  for(const row of foreign) if(BUSINESS_TABLES.includes(row.target.slice(7))) {
    assert.ok(row.dependent.startsWith('public.')&&BUSINESS_TABLES.includes(row.dependent.slice(7)),'Unexpected inbound FK');
  }
}
export async function captureInventory(db:Prisma.TransactionClient):Promise<Inventory> {
  const tables=await db.$queryRawUnsafe<Array<{table_name:string}>>("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
  validateResetSchema(tables.map(row=>row.table_name));
  const result:Inventory={};
  for(const {table_name:table} of tables) {
    const rows=await db.$queryRawUnsafe<Array<{count:bigint;checksum:string}>>(`SELECT count(*) AS count, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text COLLATE "C"),'')) AS checksum FROM public."${table}" t`);
    result[table]={count:Number(rows[0].count),checksum:rows[0].checksum};
  }
  return result;
}
export async function clearBusinessData(db:PrismaClient,expected:Inventory,rollbackAfterTruncate=false) {
  validateResetSchema(Object.keys(expected));
  return db.$transaction(async tx=>{
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout='15s'");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout='120s'");
    await tx.$executeRawUnsafe(`LOCK TABLE ${[...BUSINESS_TABLES,...PROTECTED_TABLES].sort().map(table=>`public."${table}"`).join(', ')} IN ACCESS EXCLUSIVE MODE`);
    await assertResetStructure(tx);
    const before=await captureInventory(tx);
    assert.deepEqual(before,expected,'Current data differs from verified backup; reset refused');
    await tx.$executeRawUnsafe(truncateBusinessSql());
    if(rollbackAfterTruncate) throw new Error('EXPECTED_RESET_ROLLBACK');
    const after=await captureInventory(tx);
    assertResetResult(before,after);
    return {before,after,clearedTables:BUSINESS_TABLES.length,protectedTables:PROTECTED_TABLES.length};
  },{maxWait:20_000,timeout:180_000,isolationLevel:'Serializable'});
}
