import assert from 'node:assert/strict';
import {test} from 'node:test';
import {installWriteFreeze, removeWriteFreeze} from '../scripts/release-write-freeze.js';

test('write freeze covers all mutation verbs and is paired with bounded transactional cleanup', async () => {
  const statements:string[]=[];
  const db:any={$transaction:async (callback:any,options:any)=>{
    assert.equal(options.timeout,120000);
    return callback({$executeRawUnsafe:async(sql:string)=>statements.push(sql),
      $queryRawUnsafe:async()=>[{table_name:'users'},{table_name:'monthly_fees'}]});
  }};
  assert.deepEqual(await installWriteFreeze(db,'edu_release_'+'a'.repeat(32)),{tables:2});
  assert.equal(statements.filter(s=>s.includes('BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE')).length,2);
  assert.match(statements[0],/ERRCODE='55000'/);
  await removeWriteFreeze(db);
  assert.match(statements.at(-1)!,/DROP FUNCTION/);
  await assert.rejects(()=>installWriteFreeze(db,'unsafe-marker'),/Invalid operator/);
});
