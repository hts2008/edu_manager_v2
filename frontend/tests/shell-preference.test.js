import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shellPreferenceKey, readShellPreference, writeShellPreference } from '../src/utils/shellPreference.js';

test('rail preference is isolated by tenant and actor and persists', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const key = shellPreferenceKey({ tenant_id: 'a', id: 'one' });
  assert.equal(writeShellPreference(storage, key, true), true);
  assert.equal(readShellPreference(storage, key), true);
  assert.equal(readShellPreference(storage, shellPreferenceKey({ tenant_id: 'b', id: 'one' })), false);
  assert.equal(readShellPreference(storage, shellPreferenceKey({ tenant_id: 'a', id: 'two' })), false);
  assert.equal(shellPreferenceKey(null), null);
});

test('blocked storage does not prevent navigation', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readShellPreference(storage, 'a'), false);
  assert.equal(writeShellPreference(storage, 'a', true), false);
});
