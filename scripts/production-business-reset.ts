import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {validateProductionTarget,safeReleaseError} from './release-safety.js';
import {clearBusinessData,captureInventory,authenticateBackup,assertFreshBackup,assertRehearsal,assertResetResult} from './production-business-reset-core.js';

process.loadEnvFile('.env');
validateProductionTarget(process.env.DIRECT_URL);
const mode=process.argv[2];
assert.ok(['rehearsal','production','verify'].includes(mode));
const backup=JSON.parse(readFileSync('.release-private/backup-verification.json','utf8'));
assert.equal(backup.restored,true);assert.equal(backup.inventoryVerified,true);assert.equal(backup.recoveryWritable,true);
assert.match(backup.name,/^production-[0-9]+\.dump\.enc\.json$/);
const encrypted=JSON.parse(readFileSync(`.release-private/${backup.name}`,'utf8'));
assert.equal(encrypted.checksum,backup.checksum);
const recoveryKey=Buffer.from(JSON.parse(readFileSync('.release-private/recovery-key.json','utf8')).key,'hex');
authenticateBackup(encrypted,recoveryKey,backup);recoveryKey.fill(0);
const implementationDigest=createHash('sha256').update(['scripts/production-business-reset.ts','scripts/production-business-reset-core.ts','scripts/release-safety.ts'].map(file=>readFileSync(file,'utf8')).join('\0')).digest('hex');
let target=new URL(process.env.DIRECT_URL!);
const secrets=[decodeURIComponent(target.password)];
if(mode==='rehearsal') {
  assert.match(backup.recoveryDatabase,/^edu_release_recovery_[0-9]+$/);
  const container=JSON.parse(execFileSync('docker',['inspect','edu-release-recovery-20261006'],{encoding:'utf8'}))[0];
  const password=container.Config.Env.find((value:string)=>value.startsWith('POSTGRES_PASSWORD=')).slice(18);
  secrets.push(password);
  const rehearsalDatabase=`edu_business_reset_rehearsal_${Date.now()}`;
  execFileSync('docker',['exec','edu-release-recovery-20261006','createdb','-U','release','-T',backup.recoveryDatabase,rehearsalDatabase],{stdio:'pipe'});
  target=new URL(`postgresql://release:${encodeURIComponent(password)}@127.0.0.1:15433/${rehearsalDatabase}`);
} else if(mode==='production') {
  assert.equal(process.env.BUSINESS_RESET_CONFIRMATION,'DELETE_ALL_PRODUCTION_BUSINESS_DATA_20261006');
  assertFreshBackup(backup.at);
  const rehearsal=JSON.parse(readFileSync('.release-private/business-reset-rehearsal.json','utf8'));
  assertRehearsal(rehearsal,backup.sourceInventory,backup.name,backup.checksum,implementationDigest);
  const operator=JSON.parse(readFileSync('.release-private/operator-credential.json','utf8'));
  assert.match(operator.roleName,/^edu_release_[a-f0-9]{32}$/);
  secrets.push(operator.password);target.username=operator.roleName;target.password=operator.password;
}
const db=new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});
try {
  if(mode==='production') {
    const guarded=await db.$queryRawUnsafe<Array<{count:bigint}>>("SELECT count(*) FROM pg_trigger WHERE tgname='edu_release_write_freeze' AND tgenabled='O'");
    assert.equal(Number(guarded[0].count),35,'All public tables must be write-frozen');
    const tenants=await db.tenant.findMany({select:{id:true,slug:true}});
    assert.deepEqual(tenants,[{id:'tenant_default',slug:'default'}]);
  }
  if(mode==='rehearsal') {
    await assert.rejects(clearBusinessData(db,backup.sourceInventory,true),/EXPECTED_RESET_ROLLBACK/);
    assert.deepEqual(await db.$transaction(tx=>captureInventory(tx),{timeout:120_000}),backup.sourceInventory,'Rollback did not preserve backup content');
  }
  const result=mode==='verify' ? {after:await db.$transaction(tx=>captureInventory(tx),{timeout:120_000})} : await clearBusinessData(db,backup.sourceInventory);
  if(mode==='verify') assertResetResult(backup.sourceInventory,result.after);
  const proof={at:new Date().toISOString(),mode,backup:backup.name,backupChecksum:backup.checksum,implementationDigest,rollbackVerified:mode==='rehearsal',...result};
  writeFileSync(`.release-private/business-reset-${mode}.json`,JSON.stringify(proof,null,2),{mode:0o600});
  console.info(JSON.stringify({mode,backup:backup.name,counts:Object.fromEntries(Object.entries(result.after).map(([table,row])=>[table,row.count]))}));
} catch(error) {console.error(safeReleaseError(error,secrets));process.exitCode=1;}
finally {await db.$disconnect();}
