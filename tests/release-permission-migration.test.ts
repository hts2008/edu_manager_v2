import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PERMISSION_KEYS} from '../lib/permissions-catalog.js';

test('forward permission constraint includes the exact runtime catalog', () => {
  const sql = readFileSync(new URL('../prisma/migrations/202610060001_experience_permissions/migration.sql', import.meta.url), 'utf8');
  const keys = [...sql.matchAll(/'([a-z_]+\.[a-z_.]+)'/g)].map(match => match[1]);
  assert.deepEqual(keys.sort(), [...PERMISSION_KEYS].sort());
  assert.match(sql, /ADD CONSTRAINT.*CHECK/s);
  assert.doesNotMatch(sql, /DELETE FROM|TRUNCATE/i);
});
