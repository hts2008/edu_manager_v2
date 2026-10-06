import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {execFileSync} from 'node:child_process';
import {validateProductionTarget, assertAccountsUnchanged, safeReleaseError} from './release-safety.js';

if (process.env.RELEASE_CONFIRMATION !== 'EDU_MANAGER_PRODUCTION_20261006') throw new Error('Production smoke requires explicit confirmation');
process.loadEnvFile('.env');
const targetFingerprint=validateProductionTarget(process.env.DIRECT_URL);
const credentials = JSON.parse(readFileSync('.release-private/production-admin.json','utf8'));
assert.equal(credentials.url,'https://edu-manager-gules.vercel.app');
const db = new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL}},log:[]});
const proof: Record<string,unknown> = {at:new Date().toISOString(),url:credentials.url,targetFingerprint};
const sensitiveValues=[credentials.password,decodeURIComponent(new URL(process.env.DIRECT_URL!).password)];
async function request(path:string, token?:string, body?:unknown) {
  const response = await fetch(`${credentials.url}${path}`,{method:body?'POST':'GET',
    headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30_000)});
  const payload = await response.json();
  return {status:response.status,payload};
}
try {
  const cleanup = await db.$queryRawUnsafe<Array<{triggers:bigint;operators:bigint;foreign_owners:bigint}>>(`SELECT
    (SELECT count(*) FROM pg_trigger WHERE tgname='edu_release_write_freeze') AS triggers,
    (SELECT count(*) FROM pg_roles WHERE rolname LIKE 'edu_release_%') AS operators,
    (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tableowner<>'neondb_owner') AS foreign_owners`);
  assert.equal(Number(cleanup[0].triggers),0);assert.equal(Number(cleanup[0].operators),0);assert.equal(Number(cleanup[0].foreign_owners),0);
  proof.cleanupVerified = true;
  const backupProof = JSON.parse(readFileSync('.release-private/backup-verification.json','utf8'));
  assert.match(backupProof.recoveryDatabase,/^edu_release_recovery_[0-9]+$/);
  const metadata = JSON.parse(execFileSync('docker',['inspect','edu-release-recovery-20261006'],{encoding:'utf8'}))[0];
  const localPassword = metadata.Config.Env.find((value:string)=>value.startsWith('POSTGRES_PASSWORD=')).slice(18);
  sensitiveValues.push(localPassword);
  const original = new PrismaClient({datasources:{db:{url:`postgresql://release:${encodeURIComponent(localPassword)}@127.0.0.1:15433/${backupProof.recoveryDatabase}`}},log:[]});
  try {
    const query = 'SELECT id,username,password_hash,status::text,role::text FROM users ORDER BY id COLLATE "C"';
    const before = await original.$queryRawUnsafe<Array<Record<string,unknown>>>(query);
    const after = await db.$queryRawUnsafe<Array<Record<string,unknown>>>(query);
    for(const row of [...before,...after]) if(typeof row.password_hash==='string') sensitiveValues.push(row.password_hash);
    assert.equal(before.length,2);
    assertAccountsUnchanged(before,after);
    proof.existingAccountsUnchanged=true;
  } finally {await original.$disconnect();}
  const login = await request('/api/auth/login',undefined,{tenant_slug:credentials.centerCode,username:credentials.username,password:credentials.password});
  assert.equal(login.status,200,`Login failed: ${login.payload.error?.code}`);
  const token = login.payload.data.token;
  const me = await request('/api/auth/me',token);
  assert.equal(me.status,200);assert.equal(me.payload.data.user.tenant_id,'tenant_default');
  assert.equal(me.payload.data.user.role,'admin');assert.equal(me.payload.data.user.is_platform_owner,false);
  proof.authVerified = true;
  const tenantManagement = await request('/api/admin/tenants',token);
  assert.equal(tenantManagement.status,403);proof.platformManagementDenied=true;
  const routes:Record<string,number> = {};
  for(const path of ['/api/students?page_size=100','/api/classes?page_size=100','/api/monthly-fees?page_size=100','/api/receipts?page_size=100','/api/reports/student-progress?from=2026-01&to=2026-10&page_size=50','/api/templates?page_size=100','/api/ui-experience']) {
    const result = await request(path,token);routes[path]=result.status;
    assert.equal(result.status,200,`Smoke route ${path}: ${result.payload.error?.code}`);
  }
  proof.routes=routes;
  const incorrect = await request('/api/auth/login',undefined,{tenant_slug:credentials.centerCode,username:credentials.username,password:'release-incorrect-password-check'});
  assert.equal(incorrect.status,401);proof.incorrectPasswordStatus=incorrect.status;
  const missing = await request('/api/auth/login',undefined,{username:credentials.username,password:credentials.password});
  assert.equal(missing.status,400);proof.missingCenterStatus=missing.status;
  const foreign = await request('/api/auth/login',undefined,{tenant_slug:'release-nonexistent-center',username:credentials.username,password:credentials.password});
  assert.ok([400,401,404].includes(foreign.status));proof.unknownCenterDenied=foreign.status;
  const backup = await request('/api/backups',token,{action:'run',dry_run:false});
  assert.equal(backup.status,200,`Cloud backup failed: ${backup.payload.error?.code}`);
  assert.equal(backup.payload.data.encrypted,true);assert.equal(backup.payload.data.uploaded,true);
  const verified = await request('/api/backups',token,{action:'verify',url:backup.payload.data.url});
  assert.equal(verified.status,200);assert.equal(verified.payload.data.valid,true);
  assert.equal(verified.payload.data.version,4);assert.deepEqual(verified.payload.data.counts,backup.payload.data.counts);
  proof.cloudBackup={uploaded:true,encrypted:true,verified:true,version:backup.payload.data.version};
  writeFileSync('.release-private/production-smoke.json',JSON.stringify(proof,null,2));
  console.info(JSON.stringify(proof));
} catch(error) {
  writeFileSync('.release-private/production-smoke-partial.json',JSON.stringify(proof,null,2));
  console.error(safeReleaseError(error,sensitiveValues));process.exitCode=1;
} finally {await db.$disconnect();}
