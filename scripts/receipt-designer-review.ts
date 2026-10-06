import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { resolveTuitionProgressTestTarget, assertTuitionProgressDatabaseIdentity } from '../lib/tuition-progress-test-target.js';

const container = JSON.parse(execFileSync('docker', ['inspect', 'edu-tpr-20261005'], { encoding: 'utf8' }))[0];
const password = container.Config.Env.find((item: string) => item.startsWith('POSTGRES_PASSWORD=')).slice(18);
const namespace = 'tpr_test_20261005';
const url = `postgresql://tpr:${encodeURIComponent(password)}@127.0.0.1:15432/${namespace}?schema=${namespace}`;
const target = resolveTuitionProgressTestTarget({ TEST_DATABASE_URL: url, TPR_TEST_DATABASE: namespace, TPR_TEST_SCHEMA: namespace, TPR_RELEASE_MODE: 'true', NODE_ENV: 'test' })!;
const db = new PrismaClient({ datasources: { db: { url } } });
try {
  assertTuitionProgressDatabaseIdentity(await db.$queryRaw`SELECT current_database() AS database, current_schema() AS schema`, target);
  const slug = `designer-${randomBytes(4).toString('hex')}`;
  const credential = randomBytes(24).toString('hex');
  const tenant = await db.tenant.create({ data: { slug, name: 'Receipt designer local review' } });
  const user = await db.user.create({ data: { tenantId: tenant.id, username: 'designer-review', fullName: 'Designer Review', role: 'admin', passwordHash: await bcrypt.hash(credential, 10) } });
  const template = await db.template.create({ data: { tenantId: tenant.id, templateName: 'Phiếu thu · Designer Review', type: 'receipt', paperSize: 'a5', orientation: 'portrait', jsonConfig: { objects: [] }, createdById: user.id } });
  await mkdir('.release-private', { recursive: true });
  await writeFile('.release-private/receipt-designer-review.json', JSON.stringify({ username: user.username, password: credential, slug, templateId: template.id, baseUrl: 'http://127.0.0.1:3092' }));
  const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/local-smoke-server.ts'], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, JWT_SECRET: randomBytes(48).toString('hex'), TENANCY_MODE: 'enforced', NODE_ENV: 'test', PORT: '3092', RELEASE_MAINTENANCE: 'false' },
    detached: true, stdio: 'ignore', windowsHide: true,
  });
  server.unref();
  process.stdout.write(`Isolated designer review: http://127.0.0.1:3092; server PID ${server.pid}; no existing data changed.\n`);
} finally { await db.$disconnect(); }
