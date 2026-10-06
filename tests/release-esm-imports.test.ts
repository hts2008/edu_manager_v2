import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import ts from 'typescript';

test('settings registry loads in emitted Node ESM without a TypeScript loader',()=>{
  mkdirSync('.release-private',{recursive:true});
  const directory = mkdtempSync(resolve('.release-private/esm-runtime-'));
  for (const name of ['settings-registry','ui-experience']) {
    const source = readFileSync(`lib/${name}.ts`,'utf8');
    const emitted = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    writeFileSync(resolve(directory,`${name}.js`),emitted);
  }
  const env = {...process.env};delete env.NODE_OPTIONS;
  const result = spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(pathToFileURL(resolve(directory,'settings-registry.js')).href)})`],{env,encoding:'utf8',timeout:10_000});
  assert.equal(result.status,0,result.stderr);
});
