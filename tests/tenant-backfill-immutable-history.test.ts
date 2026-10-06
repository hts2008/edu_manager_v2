import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('tenant-only backfill restores immutable triggers inside its transaction', () => {
  const sql=readFileSync(new URL('../prisma/migrations/202608120002_admin_console_tenancy_backfill/migration.sql',import.meta.url),'utf8');
  for(const table of ['class_month_plan_revisions','monthly_fee_line_revisions']) {
    assert.ok(sql.indexOf(`ALTER TABLE "${table}" DISABLE TRIGGER USER`) < sql.indexOf(`UPDATE "${table}"`));
    assert.ok(sql.indexOf(`ALTER TABLE "${table}" ENABLE TRIGGER USER`) > sql.indexOf(`UPDATE "${table}"`));
  }
  assert.ok(sql.indexOf('ENABLE TRIGGER USER') < sql.indexOf('COMMIT;'));
});
