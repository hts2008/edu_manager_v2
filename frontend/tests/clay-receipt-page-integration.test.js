import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('template library routes full-config Clay templates to dedicated editor and keeps legacy designer',()=>{
  const source=readFileSync(new URL('../src/pages/TemplatesPage.jsx',import.meta.url),'utf8');
  assert.match(source,/ClayReceiptTemplateDialog/);
  assert.match(source,/templatesService\.getById\(template\.id\)/);
  assert.match(source,/isClayReceiptTemplate\(full\)/);
  assert.match(source,/handleDesign\(template, true\)/);
  assert.match(source,/else if \(metadataOnly\)/);
  assert.doesNotMatch(source,/setEditingTemplate\(template\)/);
  assert.match(source,/navigate\(`\/templates\/\$\{template\.id\}\/design`\)/);
  assert.match(source,/Phiếu thu Clay A4/);
  assert.match(source,/Phiếu thu Clay A5/);
  assert.doesNotMatch(source,/is_default:\s*true/);
});
