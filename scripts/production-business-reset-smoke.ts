import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {safeReleaseError} from './release-safety.js';
import {PrismaClient} from '@prisma/client';
import {validateProductionTarget} from './release-safety.js';

const credentials=JSON.parse(readFileSync('.release-private/production-admin.json','utf8'));
assert.equal(credentials.url,'https://edu-manager-gules.vercel.app');
const mode=process.argv[2];assert.ok(['maintenance','live'].includes(mode));
async function request(path:string,token?:string,body?:unknown) {
  const response=await fetch(credentials.url+path,{method:body?'POST':'GET',
    headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30_000)});
  return {status:response.status,payload:await response.json(),retryAfter:response.headers.get('retry-after')};
}
try {
  if(mode==='maintenance') {
    const response=await request('/api/auth/me');assert.equal(response.status,503);assert.ok(response.retryAfter);
    console.info(JSON.stringify({maintenanceVerified:true,status:response.status}));
  } else {
    process.loadEnvFile('.env');validateProductionTarget(process.env.DIRECT_URL);
    const db=new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL}},log:[]});
    try {
      const cleanup=await db.$queryRawUnsafe<Array<{triggers:bigint;operators:bigint;foreign_owners:bigint}>>(`SELECT
        (SELECT count(*) FROM pg_trigger WHERE tgname='edu_release_write_freeze') AS triggers,
        (SELECT count(*) FROM pg_roles WHERE rolname LIKE 'edu_release_%') AS operators,
        (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tableowner<>'neondb_owner') AS foreign_owners`);
      for(const count of Object.values(cleanup[0])) assert.equal(Number(count),0,'Temporary reset guards not cleaned up');
    } finally {await db.$disconnect();}
    const login=await request('/api/auth/login',undefined,{tenant_slug:credentials.centerCode,username:credentials.username,password:credentials.password});
    assert.equal(login.status,200);const token=login.payload.data.token;
    const me=await request('/api/auth/me',token);assert.equal(me.status,200);
    assert.equal(me.payload.data.user.tenant_id,'tenant_default');assert.equal(me.payload.data.user.role,'admin');
    const routes:Record<string,{status:number;count:number}>={};
    for(const [path,key] of [
      ['/api/students?include_deleted=true','students'],['/api/parents?include_deleted=true','parents'],
      ['/api/teachers','teachers'],['/api/classes','classes'],['/api/receipts?include_deleted=true','receipts'],
      ['/api/payments?include_deleted=true','payments'],['/api/monthly-fees','fees'],
      ['/api/reports/student-progress?from=2026-01&to=2026-10','students'],
    ]) {
      const response=await request(path,token);assert.equal(response.status,200,`Route status: ${path}`);
      const data=response.payload.data;
      const rows=data[key]??data.monthly_fees;
      assert.ok(Array.isArray(rows),`Expected collection missing: ${path}`);assert.equal(rows.length,0,`Nonempty: ${path}`);
      routes[path]={status:response.status,count:rows.length};
    }
    const templates=await request('/api/templates',token);assert.equal(templates.status,200);
    const proof={at:new Date().toISOString(),url:credentials.url,cleanupVerified:true,adminLoginVerified:true,emptyRoutes:routes,templatesAvailable:true};
    writeFileSync('.release-private/business-reset-smoke.json',JSON.stringify(proof,null,2),{mode:0o600});
    console.info(JSON.stringify(proof));
  }
} catch(error) {console.error(safeReleaseError(error,[credentials.password]));process.exitCode=1;}
