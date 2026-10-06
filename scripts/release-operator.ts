import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, openSync, fsyncSync, closeSync, writeSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {PrismaClient} from '@prisma/client';

const privateDir = resolve('.release-private');
mkdirSync(privateDir, {recursive: true});
process.loadEnvFile('.env');
const production = new URL(process.env.DIRECT_URL!);
if (production.hostname !== 'ep-silent-queen-aoujb3oc.c-2.ap-southeast-1.aws.neon.tech' || production.pathname !== '/neondb' || production.username !== 'neondb_owner') {
  throw new Error('Release target does not match the verified EDUMANAGER production identity');
}
const mode = process.argv[2];
const rehearsalHost = 'ep-shiny-river-aoxeh0qp.c-2.ap-southeast-1.aws.neon.tech';
const target = new URL(production);
if (!['inspect','backup','production-migrate','production-provision','production-audit','production-freeze','production-unfreeze'].includes(mode!)) target.hostname = rehearsalHost;
if (mode === 'local-rehearsal' || mode === 'local-freeze-check') {
  const inspect = spawnSync('docker', ['inspect','edu-release-recovery-20261006'], {encoding:'utf8'});
  const container = JSON.parse(inspect.stdout)[0];
  const password = container.Config.Env.find((value: string) => value.startsWith('POSTGRES_PASSWORD=')).slice(18);
  target.hostname='127.0.0.1'; target.port='15433'; target.username='release'; target.password=password;
  target.pathname='/edu_release_recovery'; target.search='';
}
if (['production-migrate','production-provision','production-freeze','production-unfreeze'].includes(mode!) && process.env.RELEASE_CONFIRMATION !== 'EDU_MANAGER_PRODUCTION_20261006') {
  throw new Error('Explicit production confirmation required');
}
const freezePath = resolve(privateDir,'write-freeze.json');
if (!existsSync(freezePath)) writeFileSync(freezePath,JSON.stringify({operatorName:`edu_release_${randomBytes(16).toString('hex')}`}),{flag:'wx',mode:0o600});
const {operatorName} = JSON.parse(readFileSync(freezePath,'utf8'));
const operatorPath = resolve(privateDir,'operator-credential.json');
if (!existsSync(operatorPath)) writeFileSync(operatorPath,JSON.stringify({roleName:operatorName,password:randomBytes(24).toString('base64url')}),{flag:'wx',mode:0o600});
const operatorCredential = JSON.parse(readFileSync(operatorPath,'utf8'));
if (['production-migrate','production-provision','rehearsal-operator-check'].includes(mode!)) {
  target.username=operatorCredential.roleName; target.password=operatorCredential.password;
}
process.env.DATABASE_URL = target.toString();
process.env.DIRECT_URL = target.toString();
let db = new PrismaClient({datasources: {db: {url: target.toString()}}, log: []});
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const output = (name: string, value: unknown) => writeFileSync(resolve(privateDir, name), JSON.stringify(value, null, 2), {mode: 0o600});
function run(args: string[], env = process.env) {
  const result = spawnSync(process.execPath, args, {env, encoding: 'utf8', timeout: 240_000, maxBuffer: 10 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`Release command failed: ${args.slice(0,3).join(' ')}; ${result.stderr?.replace(/postgres(?:ql)?:\/\/\S+/g, '[DATABASE_URL]')}`);
  return result.stdout;
}
async function becomeOperator() {
  const name = operatorCredential.roleName, password = operatorCredential.password;
  if (!/^edu_release_[a-f0-9]{32}$/.test(name) || !/^[a-zA-Z0-9_-]{32}$/.test(password)) throw new Error('Invalid operator credential');
  const roles = await db.$queryRawUnsafe<Array<{rolname:string}>>('SELECT rolname FROM pg_roles WHERE rolname=$1',name);
  if (!roles.length) {
    await db.$executeRawUnsafe(`CREATE ROLE "${name}" LOGIN INHERIT PASSWORD '${password}' VALID UNTIL '${new Date(Date.now()+86400000).toISOString()}'`);
  }
  // Managed Neon does not allow granting the provider-created owner role.
  // Transfer ownership for the maintenance window, without allowing runtime SET ROLE.
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe(`GRANT "${name}" TO "neondb_owner" WITH INHERIT TRUE, SET TRUE`);
    await tx.$executeRawUnsafe(`REASSIGN OWNED BY "neondb_owner" TO "${name}"`);
    await tx.$executeRawUnsafe(`GRANT "${name}" TO "neondb_owner" WITH INHERIT FALSE, SET FALSE`);
  },{timeout:120_000});
  const permission = await db.$queryRawUnsafe<Array<{allowed:boolean}>>('SELECT pg_has_role(current_user,$1,\'SET\') AS allowed',name);
  if (permission[0].allowed && target.hostname !== '127.0.0.1') throw new Error('Runtime role can assume release operator; refused freeze');
  const operatorUrl = new URL(target); operatorUrl.username=name; operatorUrl.password=password;
  await db.$disconnect();
  db = new PrismaClient({datasources:{db:{url:operatorUrl.toString()}},log:[]});
  process.env.DATABASE_URL=operatorUrl.toString();process.env.DIRECT_URL=operatorUrl.toString();
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
    '-e', 'PGPASSWORD', '-e', `PGDATABASE=${env.PGDATABASE}`, '-e', 'PGSSLMODE=require',
    'edu-release-recovery-20261006', 'pg_dump', '--format=custom', '--no-owner', '--no-acl'];
  const result = spawnSync('docker', args, {env,maxBuffer: 256 * 1024 * 1024, timeout: 240_000});
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
  const recoveryDatabase = `edu_release_recovery_${timestamp}`;
  const created = spawnSync('docker',['exec','edu-release-recovery-20261006','createdb','-U','release',recoveryDatabase]);
  if (created.status !== 0) throw new Error('Isolated recovery database creation failed');
  const restore = spawnSync('docker', ['exec','-i','edu-release-recovery-20261006','pg_restore','-U','release',
    '-d',recoveryDatabase,'--single-transaction','--no-owner','--no-acl','--exit-on-error'], {input:clear, timeout:240_000,maxBuffer:10*1024*1024});
  if (restore.status !== 0) throw new Error('Isolated physical restore failed');
  output('backup-verification.json', {name, checksum:sha(clear),bytes:clear.length, recoveryDatabase,restored:true, at:new Date().toISOString()});
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
  if (mode === 'production-migrate') {
    const rehearsed = JSON.parse(readFileSync(resolve(privateDir,'local-rehearsal-migration-manifest.json'),'utf8'));
    if (JSON.stringify(checksums) !== JSON.stringify(rehearsed)) throw new Error('Migration bytes differ from verified physical-clone rehearsal');
    const frozen = await db.$queryRawUnsafe<Array<{unguarded:bigint}>>(`SELECT count(*) AS unguarded FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='edu_release_write_freeze' AND t.tgenabled='O')`);
    if (Number(frozen[0].unguarded) !== 0) throw new Error('Production migration requires all existing tables write-frozen');
  }
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
  if (mode === 'production-migrate') {
    const {installWriteFreeze} = await import('./release-write-freeze.js');
    await installWriteFreeze(db,operatorName);
  }
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
  const credentialPath = resolve(privateDir,'production-admin.json');
  const previous = existsSync(credentialPath) ? JSON.parse(readFileSync(credentialPath,'utf8')) : null;
  const password = previous?.password || randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password,12);
  const credentials = {url:'https://edu-manager-gules.vercel.app',centerCode:'default',username:'admin-live',password};
  if (previous && (previous.centerCode !== 'default' || previous.username !== 'admin-live')) throw new Error('Credential identity mismatch');
  if (!previous) {
    const descriptor = openSync(credentialPath,'wx',0o600);
    try {writeSync(descriptor,JSON.stringify(credentials,null,2)); fsyncSync(descriptor);} finally {closeSync(descriptor);}
  }
  await db.$transaction(async tx => {
    const tenant = await tx.tenant.findUnique({where:{id:'tenant_default'}});
    if (!tenant || tenant.status !== 'active' || tenant.slug !== 'default') throw new Error('Historical operating center identity does not match');
    const existing = await tx.user.findFirst({where:{tenantId:tenant.id,username:credentials.username}});
    if (existing) {
      if (!previous || existing.role !== 'admin' || existing.status !== 'active' || existing.isPlatformOwner || !await bcrypt.compare(password,existing.passwordHash)) throw new Error('Admin identity collision; refused overwrite');
      return;
    }
    const admin = await tx.user.create({data:{tenantId:tenant.id,username:credentials.username,passwordHash,
      fullName:'Quan tri van hanh',role:'admin',status:'active',isPlatformOwner:false}});
    await tx.activityLog.create({data:{tenantId:tenant.id,userId:admin.id,action:'RELEASE_ADMIN_PROVISIONED',
      entityType:'user',entityId:admin.id}});
  },{isolationLevel:'Serializable'});
  console.info(JSON.stringify({centerCode:credentials.centerCode,username:credentials.username,created:true,existingAccountsUnchanged:true}));
}
try {
  if (mode === 'inspect-roles') {console.info(JSON.stringify(await db.$queryRawUnsafe("SELECT member.rolname AS member, granted.rolname AS granted, m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member JOIN pg_roles granted ON granted.oid=m.roleid WHERE member.rolname=current_user")));}
  else if (mode === 'inspect') {const data=await inventory();output('production-inventory.json',data);console.info(JSON.stringify({targetFingerprint:sha(production.hostname+production.pathname).slice(0,12),tables:Object.keys(data).length,counts:Object.fromEntries(Object.entries(data).map(([k,v]:any)=>[k,v.count]))}));}
  else if (mode === 'backup') await backup();
  else if (mode === 'rehearsal' || mode === 'local-rehearsal' || mode === 'production-migrate') await migrate();
  else if (mode === 'production-audit' || mode === 'rehearsal-audit') await audit();
  else if (mode === 'production-provision') await provision();
  else if (mode === 'rehearsal-operator-check') {
    run(['node_modules/prisma/build/index.js','db','execute','--schema','prisma/schema.prisma','--file','prisma/migrations/202610060001_experience_permissions/migration.sql']);
    console.info(JSON.stringify({managedNeonOperatorCliVerified:true}));
  }
  else if (mode === 'production-freeze' || mode === 'rehearsal-freeze') {
    await becomeOperator();
    const {installWriteFreeze} = await import('./release-write-freeze.js');
    const result = await installWriteFreeze(db,operatorName); output('production-write-freeze.json',{...result,at:new Date().toISOString()});
    const normal = new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});
    try {
      let denied=false;
      try {await normal.$executeRawUnsafe('UPDATE users SET username=username');} catch(error:any) {denied=error?.meta?.code==='55000';}
      if (!denied) throw new Error('Ordinary production writer not denied');
      console.info(JSON.stringify({frozen:true,ordinaryWriterDenied:true,...result}));
    } finally {await normal.$disconnect();}
  } else if (mode === 'production-unfreeze' || mode === 'rehearsal-unfreeze') {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`GRANT "${operatorName}" TO "neondb_owner" WITH INHERIT TRUE, SET TRUE`);
      await tx.$executeRawUnsafe(`REASSIGN OWNED BY "${operatorName}" TO "neondb_owner"`);
    },{timeout:120_000});
    const {removeWriteFreeze} = await import('./release-write-freeze.js'); await removeWriteFreeze(db);
    await db.$executeRawUnsafe(`DROP ROLE "${operatorName}"`);
    console.info(JSON.stringify({frozen:false}));
  } else if (mode === 'local-freeze-check') {
    const {installWriteFreeze,removeWriteFreeze} = await import('./release-write-freeze.js');
    const localOwner=decodeURIComponent(target.username);
    const existedRole=await db.$queryRawUnsafe<Array<{rolname:string}>>('SELECT rolname FROM pg_roles WHERE rolname=$1',operatorName);
    if (!existedRole.length) {
      await db.$executeRawUnsafe(`CREATE ROLE "${operatorName}" LOGIN INHERIT PASSWORD '${operatorCredential.password}'`);
      await db.$executeRawUnsafe(`GRANT "${localOwner}" TO "${operatorName}"`);
    }
    const outsiderUrl = new URL(target); outsiderUrl.searchParams.set('application_name',operatorName);
    const outsider = new PrismaClient({datasources:{db:{url:outsiderUrl.toString()}},log:[]});
    const before = await inventory();
    const operatorUrl=new URL(target); operatorUrl.username=operatorName;operatorUrl.password=operatorCredential.password;
    await db.$disconnect();db=new PrismaClient({datasources:{db:{url:operatorUrl.toString()}},log:[]});
    process.env.DATABASE_URL=operatorUrl.toString();process.env.DIRECT_URL=operatorUrl.toString();
    try {
      await installWriteFreeze(db,operatorName);
      let denied = false;
      try {await outsider.$executeRawUnsafe('UPDATE users SET username=username');} catch(error:any) {denied=error?.meta?.code==='55000';}
      if (!denied) throw new Error('Write freeze did not deny old deployment');
      run(['node_modules/prisma/build/index.js','db','execute','--schema','prisma/schema.prisma','--file','prisma/migrations/202610060001_experience_permissions/migration.sql']);
      const after = await inventory(); if (JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Freeze rehearsal changed data');
      console.info(JSON.stringify({oldWriterDenied:true,operatorCliAllowed:true,dataUnchanged:true}));
    } finally {await removeWriteFreeze(db);await outsider.$disconnect();}
  }
  else throw new Error('Supported modes: inspect, backup, rehearsal, production-migrate');
} catch(error) {let message=error instanceof Error ? error.message : 'Release operation failed';
  for(const secret of [operatorCredential.password,decodeURIComponent(production.password)]) message=message.split(secret).join('[REDACTED]');
  console.error(message);process.exitCode=1;}
finally {await db.$disconnect();}
