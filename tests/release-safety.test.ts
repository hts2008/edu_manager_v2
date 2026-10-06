import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {validateProductionTarget, assertAccountsUnchanged, safeReleaseError, releaseExplicitLock} from '../scripts/release-safety.js';

test('production target rejects child, wrong database, role and protocol without leaking URL', () => {
  const base='postgresql://neondb_owner:secret@ep-silent-queen-aoujb3oc.c-2.ap-southeast-1.aws.neon.tech/neondb';
  assert.ok(validateProductionTarget(base));
  for (const value of [base.replace('silent-queen-aoujb3oc','shiny-river-aoxeh0qp'),base.replace('/neondb','/other'),base.replace('neondb_owner','other'),base.replace('postgresql:','https:')]) {
    assert.throws(()=>validateProductionTarget(value), error => !String(error).includes('secret'));
  }
});
test('account mismatch and error sink never print hashes or credentials', () => {
  const account={id:'user-1',password_hash:'sensitive-old',username:'admin'};
  assert.throws(()=>assertAccountsUnchanged([account],[{...account,password_hash:'sensitive-new'}]), error => {
    assert.match(String(error),/password_hash/); assert.doesNotMatch(String(error),/sensitive/); return true;
  });
  assertAccountsUnchanged([account],[account]);
  assert.doesNotMatch(safeReleaseError(new Error('postgresql://u:secret@host/db hash-value'),['hash-value','secret']),/hash-value|secret/);
  assert.doesNotMatch(safeReleaseError(new Error('$2b$12$'+'A'.repeat(53))),/\$2b\$/);
  assert.throws(()=>assertAccountsUnchanged([account],[]),/changed fields/);
});
test('explicit lock cleanup rejects missing evidence and rechecks exact eligibility in termination SQL', async () => {
  const calls:any[]=[];
  const db:any={$queryRawUnsafe:async (...args:any[])=>{calls.push(args);return [{terminated:true}];}};
  await assert.rejects(()=>releaseExplicitLock(db,{}),/explicit/i);
  await releaseExplicitLock(db,{pid:'830',backendStart:'2026-10-06T09:00:00Z',marker:'edu_release_cli_0123456789abcdef0123456789abcdef'});
  assert.equal(calls.length,1);
  for(const fragment of ['a.pid=$1','a.backend_start=$2','a.application_name=$3','a.datname=current_database()','a.usename=current_user',"a.state='idle'",'a.xact_start IS NULL','l.classid=0','l.objid=72707369','l.objsubid=1','l.database=','l.granted']) assert.ok(calls[0][0].includes(fragment),fragment);
  db.$queryRawUnsafe=async()=>[];
  await assert.rejects(()=>releaseExplicitLock(db,{pid:'830',backendStart:'2026-10-06T09:00:00Z',marker:'edu_release_cli_0123456789abcdef0123456789abcdef'}),/refused/i);
});
test('migration has no generic automatic termination on success or failure',()=>{
  const source=readFileSync('scripts/release-operator.ts','utf8');
  assert.doesNotMatch(source,/releaseExitedCliLocks/);
  assert.equal((source.match(/await releaseExplicitLock/g)||[]).length,1);
  assert.match(source,/RELEASE_CLI_EXIT_CONFIRMED/);
  assert.match(source,/searchParams.set\('application_name',marker\)/);
});
