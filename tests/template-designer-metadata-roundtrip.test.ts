import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { setAuthConfigForTests } from '../lib/auth-config.js';
import { createTestRequest, createTestResponse } from '../lib/request-response-adapter.js';
import createHandler from '../server/api/templates/index.js';
import itemHandler from '../server/api/templates/[id]/index.js';
import { parseTemplateRenderContract } from '../lib/template-render-contract.js';
import { onePixelPngDataUri } from './fixtures/template-render-v2.js';

test('authenticated template POST / PUT / GET preserves designer V2 metadata and legacy JSON', async t => {
  process.env.NODE_ENV = 'test';
  const auth = { secret: 'designer-metadata-test-secret-long-enough', issuer: 'designer-test',
    audience: 'designer-api', algorithm: 'HS256' as const };
  setAuthConfigForTests(auth);
  const tenantId = 'designer-test-tenant';
  const stub = (target: any, name: string, implementation: any) => {
    const original = target[name]; target[name] = implementation;
    t.after(() => { target[name] = original; });
  };
  // Every delegate reached by these routes is replaced; this test never opens a DB connection.
  stub(prisma.authSession, 'findFirst', async () => ({ id: 'session', tenantId }));
  stub(prisma.tenant, 'findUnique', async () => ({ id: tenantId, status: 'active', configVersion: 1 }));
  stub(prisma.rolePermission, 'findMany', async () => []);
  stub(prisma.user, 'findUnique', async () => ({ id: 'admin-test', role: 'admin', status: 'active',
    tokenVersion: 0, tenantId, isPlatformOwner: false }));
  stub(prisma.activityLog, 'create', async () => ({ id: 1 }));
  let stored: any;
  stub(prisma.template, 'create', async ({ data }: any) => {
    stored = structuredClone({ id: 'template-test', isDefault: false, ...data }); return stored;
  });
  stub(prisma.template, 'findUnique', async () => structuredClone(stored));
  stub(prisma.template, 'update', async ({ data }: any) => {
    stored = structuredClone({ ...stored, ...data }); return stored;
  });
  const token = jwt.sign({ typ: 'user', ver: 0, role: 'admin', tid: tenantId, pown: false }, auth.secret,
    { algorithm: auth.algorithm, issuer: auth.issuer, audience: auth.audience,
      subject: 'admin-test', jwtid: 'test-session', expiresIn: '5m' });
  const call = async (handler: typeof createHandler, method: string, body?: any) => {
    const response = createTestResponse();
    await handler(createTestRequest({ method, headers: { authorization: `Bearer ${token}` },
      query: { id: 'template-test' }, body }), response.res);
    assert.equal(response.state.statusCode, method === 'POST' ? 201 : 200);
    const data = (response.state.body as any).data;
    return JSON.parse((data.template || data).json_config);
  };
  const legacy = { version: '7.1.0', objects: [{ type: 'Textbox', text: '{{total_amount}}',
    bindingField: 'total_amount', lockMovementX: true }] };
  assert.deepEqual(await call(createHandler, 'POST', { template_name: 'Test', type: 'receipt',
    paper_size: 'a5', orientation: 'portrait', json_config: legacy }), legacy);
  assert.deepEqual(await call(itemHandler, 'GET'), legacy);
  const config = { version: 2, background: { src: onePixelPngDataUri },
    canvas: { width: 559, height: 794 }, bindings: [{ field: 'total_amount', x: 20, y: 20,
      width: 200, height: 40, fontSize: 12 }], designer_print: { schemaVersion: 1 },
    editor_source: { ...legacy, paper: { preset: 'a5' }, orientation: 'portrait' },
    future_metadata: { nested: ['keep', { radius: 12, shadow: { blur: 4 } }] } };
  assert.deepEqual(await call(itemHandler, 'PUT', { json_config: JSON.stringify(config) }), config);
  assert.deepEqual(await call(itemHandler, 'GET'), config);
  assert.deepEqual(stored.jsonConfig, config);
  assert.equal('editor_source' in parseTemplateRenderContract(config), false);
  assert.deepEqual(config.editor_source.objects, legacy.objects);
  config.future_metadata.nested[0] = 'object-form';
  assert.deepEqual(await call(itemHandler, 'PUT', { json_config: config }), config);
  assert.deepEqual(await call(itemHandler, 'GET'), config);
});
