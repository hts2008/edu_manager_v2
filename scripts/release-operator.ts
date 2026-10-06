import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {PrismaClient} from '@prisma/client';

const privateDir = resolve('.release-private');
mkdirSync(privateDir, {recursive: true});
process.loadEnvFile('.env');
const production = new URL(process.env.DIRECT_URL!);
if (production.hostname !== 'ep-silent-queen-aoujb3oc.c-2.ap-southeast-1.aws.neon.tech' || production.pathname !== '/neondb') {
  throw new Error('Release target does not match the verified EDUMANAGER production identity');
}
const mode = process.argv[2];
const rehearsalHost = 'ep-shiny-river-aoxeh0qp.c-2.ap-southeast-1.aws.neon.tech';
const target = new URL(production);
if (!['inspect','backup','production-migrate','production-provision','production-audit'].includes(mode!)) target.hostname = rehearsalHost;
if (mode === 'local-rehearsal') {
  const inspect = spawnSync('docker', ['inspect','edu-release-recovery-20261006'], {encoding:'utf8'});
  const container = JSON.parse(inspect.stdout)[0];
  const password = container.Config.Env.find((value: string) => value.startsWith('POSTGRES_PASSWORD=')).slice(18);
  target.hostname='127.0.0.1'; target.port='15433'; target.username='release'; target.password=password;
  target.pathname='/edu_release_recovery'; target.search='';
}
if (['production-migrate','production-provision'].includes(mode!) && process.env.RELEASE_CONFIRMATION !== 'EDU_MANAGER_PRODUCTION_20261006') {
  throw new Error('Explicit production confirmation required');
}
process.env.DATABASE_URL = target.toString();
process.env.DIRECT_URL = target.toString();
const db = new PrismaClient({datasources: {db: {url: target.toString()}}, log: []});
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const output = (name: string, value: unknown) => writeFileSync(resolve(privateDir, name), JSON.stringify(value, null, 2), {mode: 0o600});
function run(args: string[], env = process.env) {
  const result = spawnSync(process.execPath, args, {env, encoding: 'utf8', timeout: 240_000, maxBuffer: 10 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`Release command failed: ${args.slice(0,3).join(' ')}; ${result.stderr?.replace(/postgres(?:ql)?:\/\/\S+/g, '[DATABASE_URL]')}`);
  return result.stdout;
}
async function inventory() {
  return db.$transaction(async tx => {
    const tables = await tx.$queryRawUnsafe<Array<{table_name: string}>>("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' ORDER BY table_name");
    const metrics: Record<string, unknown> = {};
    for (const {table_name: table} of tables) {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid table identifier');
      const rows = await tx.$queryRawUnsafe<Array<{count: bigint; checksum: string}>>(`SELECT count(*) AS count, md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text),'')) AS checksum FROM "${table}" t`);
      metrics[table] = {count: Number(rows[0].count), checksum: rows[0].checksum};
    }
    return metrics;
  }, {isolationLevel: 'RepeatableRead', timeout: 120_000});
}
async function backup() {
  const keyPath = resolve(privateDir, 'recovery-key.json');
  if (!existsSync(keyPath)) output('recovery-key.json', {key: randomBytes(32).toString('hex')});
  const key = Buffer.from(JSON.parse(readFileSync(keyPath, 'utf8')).key, 'hex');
  const env = {...process.env, PGHOST: production.hostname, PGPORT: production.port || '5432',
    PGUSER: decodeURIComponent(production.username), PGPASSWORD: decodeURIComponent(production.password),
    PGDATABASE: production.pathname.slice(1), PGSSLMODE: 'require'};
  const args = ['exec', '-e', `PGHOST=${env.PGHOST}`, '-e', `PGPORT=${env.PGPORT}`, '-e', `PGUSER=${env.PGUSER}`,
    '-e', `PGPASSWORD=${env.PGPASSWORD}`, '-e', `PGDATABASE=${env.PGDATABASE}`, '-e', 'PGSSLMODE=require',
    'edu-release-recovery-20261006', 'pg_dump', '--format=custom', '--no-owner', '--no-acl'];
  const result = spawnSync('docker', args, {maxBuffer: 256 * 1024 * 1024, timeout: 240_000});
  if (result.status !== 0) throw new Error('Production dump failed; no migrations performed');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(result.stdout), cipher.final()]);
  const timestamp = Date.now();
  const name = `production-${timestamp}.dump.enc.json`;
  output(name, {algorithm:'aes-256-gcm', iv:iv.toString('hex'), tag:cipher.getAuthTag().toString('hex'),
    checksum:sha(result.stdout), ciphertext: encrypted.toString('base64')});
  const restored = createDecipheriv('aes-256-gcm', key, iv); restored.setAuthTag(cipher.getAuthTag());
  const clear = Buffer.concat([restored.update(encrypted), restored.final()]);
  if (sha(clear) !== sha(result.stdout)) throw new Error('Backup checksum mismatch');
  const restore = spawnSync('docker', ['exec','-i','edu-release-recovery-20261006','pg_restore','-U','release',
    '-d','edu_release_recovery','--no-owner','--no-acl','--exit-on-error'], {input:clear, timeout:240_000,maxBuffer:10*1024*1024});
  if (restore.status !== 0) throw new Error('Isolated physical restore failed');
  output('backup-verification.json', {name, checksum:sha(clear),bytes:clear.length, restored:true, at:new Date().toISOString()});
  console.info(JSON.stringify({backup:name, encrypted:true, checksumVerified:true, isolatedRestore:true}));
}
async function migrate() {
  const {createPostgresVerificationReader, captureTenantBackfillBaseline, verifyTenantBackfill} = await import('./verify-tenant-backfill.js');
  const reader = createPostgresVerificationReader(db);
  const prismaCli = 'node_modules/prisma/build/index.js';
  const apply = (name: string) => {
    run([prismaCli,'db','execute','--schema','prisma/schema.prisma','--file',`prisma/migrations/${name}/migration.sql`]);
    run([prismaCli,'migrate','resolve','--applied',name]);
    console.info(JSON.stringify({migration:name, applied:true, target:mode==='production-migrate'?'production':'rehearsal'}));
  };
  const migrations = await db.$queryRawUnsafe<Array<{migration_name: string}>>('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  const applied = new Set(migrations.map(m => m.migration_name));
  const checksums = Object.fromEntries(readdirSync('prisma/migrations', {withFileTypes:true}).filter(item=>item.isDirectory())
    .map(item=>[item.name,sha(readFileSync(`prisma/migrations/${item.name}/migration.sql`))]));
  output(`${mode}-migration-manifest.json`,checksums);
  const expand = '202608120001_admin_console_tenancy_expand';
  if (!applied.has(expand)) apply(expand);
  const baseline = await captureTenantBackfillBaseline(reader);
  output(`${mode}-baseline.json`,baseline);
  const backfill = '202608120002_admin_console_tenancy_backfill';
  if (!applied.has(backfill)) apply(backfill);
  const verified = await verifyTenantBackfill(reader, baseline);
  output(`${mode}-backfill.json`,verified);
  if (!verified.readyForConstrain) throw new Error('Backfill validation failed; contraction refused');
  const before = await inventory();
  run([prismaCli,'migrate','deploy']);
  const after = await inventory();
  for (const table of ['receipts','payments','monthly_fees','monthly_fee_lines','student_progress_months','student_progress_daily_entries']) {
    if (JSON.stringify(before[table])!==JSON.stringify(after[table])) throw new Error(`Protected data changed during contraction: ${table}`);
  }
  output(`${mode}-result.json`,{at:new Date().toISOString(), backfill:verified.summary, protectedDataUnchanged:true, before,after});
  console.info(JSON.stringify({target:mode==='production-migrate'?'production':'rehearsal',migrationComplete:true,protectedDataUnchanged:true}));
}
async function audit() {
  const {inventoryTuitionProgress} = await import('../lib/tuition-progress-audit.js');
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return inventoryTuitionProgress(tx as any, new Date());
  }, {isolationLevel:'RepeatableRead',timeout:120_000});
  output(`${mode}-audit.json`,result);
  console.info(JSON.stringify({writes:result.writes, verifiedCounts:result.verifiedCounts, counts:result.counts}));
}
async function provision() {
  const {default:bcrypt} = await import('bcryptjs');
  const password = randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password,12);
  const credentials = {url:'https://edu-manager-gules.vercel.app',centerCode:'default',username:'admin-live',password};
  if (existsSync(resolve(privateDir,'production-admin.json'))) throw new Error('Existing credential handoff must not be overwritten');
  await db.$transaction(async tx => {
    const tenant = await tx.tenant.findUnique({where:{id:'tenant_default'}});
    if (!tenant || tenant.status !== 'active' || tenant.slug !== 'default') throw new Error('Historical operating center identity does not match');
    if (await tx.user.findFirst({where:{tenantId:tenant.id,username:credentials.username}})) throw new Error('Admin identity collision; refused overwrite');
    const admin = await tx.user.create({data:{tenantId:tenant.id,username:credentials.username,passwordHash,
      fullName:'Quan tri van hanh',role:'admin',status:'active',isPlatformOwner:false}});
    await tx.activityLog.create({data:{tenantId:tenant.id,userId:admin.id,action:'RELEASE_ADMIN_PROVISIONED',
      entityType:'user',entityId:admin.id}});
  },{isolationLevel:'Serializable'});
  output('production-admin.json',credentials);
  console.info(JSON.stringify({centerCode:credentials.centerCode,username:credentials.username,created:true,existingAccountsUnchanged:true}));
}
try {
  if (mode === 'inspect') {const data=await inventory();output('production-inventory.json',data);console.info(JSON.stringify({targetFingerprint:sha(production.hostname+production.pathname).slice(0,12),tables:Object.keys(data).length,counts:Object.fromEntries(Object.entries(data).map(([k,v]:any)=>[k,v.count]))}));}
  else if (mode === 'backup') await backup();
  else if (mode === 'rehearsal' || mode === 'local-rehearsal' || mode === 'production-migrate') await migrate();
  else if (mode === 'production-audit' || mode === 'rehearsal-audit') await audit();
  else if (mode === 'production-provision') await provision();
  else throw new Error('Supported modes: inspect, backup, rehearsal, production-migrate');
} catch(error) {console.error(error instanceof Error ? error.message : 'Release operation failed');process.exitCode=1;}
finally {await db.$disconnect();}
