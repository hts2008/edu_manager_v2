import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { generatePdf } from '../lib/pdf.js';

const review = JSON.parse(await readFile('.release-private/receipt-designer-review.json', 'utf8'));
const container = JSON.parse(execFileSync('docker', ['inspect', 'edu-tpr-20261005'], { encoding: 'utf8' }))[0];
const password = container.Config.Env.find((item: string) => item.startsWith('POSTGRES_PASSWORD=')).slice(18);
const db = new PrismaClient({ datasources: { db: { url: `postgresql://tpr:${encodeURIComponent(password)}@127.0.0.1:15432/tpr_test_20261005?schema=tpr_test_20261005` } } });
try {
  const identity = await db.$queryRaw<any[]>`SELECT current_database() AS database, current_schema() AS schema`;
  assert.equal(identity[0].database, 'tpr_test_20261005'); assert.equal(identity[0].schema, 'tpr_test_20261005');
  const template = await db.template.findUniqueOrThrow({ where: { id: review.templateId }, include: { tenant: true } });
  assert.equal(template.tenant.slug, review.slug);
  const config: any = template.jsonConfig;
  assert.equal(config.version, 2); assert.ok(config.editor_source.objects.length > 10);
  assert.ok(config.bindings.some((binding: any) => binding.field === 'amount_display'));
  const sample = { receipt_id: 'cmfxreceiptpreview0000001', receipt_date: '06/10/2026', student_name: 'Nguyễn Minh An', parent_name: 'Trần Thu Hà', parent_phone: '0900 000 000', class_name: 'Tiếng Anh · Movers', month: '2026-10', amount_display: '1.250.000 ₫', amount_in_words: 'Một triệu hai trăm năm mươi nghìn đồng', payment_method: 'Chuyển khoản', center_name: 'TRUNG TÂM GIÁO DỤC', notes: 'Học phí tháng 10' };
  const pdf = await generatePdf(template, sample);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const directory = 'docs/artifacts/receipt-designer-2026-10-06';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/receipt-${template.paperSize}.pdf`, pdf);
  await writeFile(`${directory}/verification-${template.paperSize}.json`, JSON.stringify({ paper: template.paperSize, version: config.version, layers: config.editor_source.objects.length, bindings: config.bindings.length, canvas: config.canvas, pdfBytes: pdf.length, productionTouched: false }, null, 2));
  process.stdout.write(`Verified persisted ${template.paperSize}: ${config.editor_source.objects.length} layers/${config.bindings.length} bindings, PDF ${pdf.length} bytes.\n`);
} finally { await db.$disconnect(); }
