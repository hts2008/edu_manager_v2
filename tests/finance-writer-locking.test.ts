import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertBoundedSerializableWriter(endpoint: string) {
  assert.match(endpoint, /runSerializableTransaction\(prisma,/);
  assert.match(endpoint, /maxAttempts:\s*3/);
  assert.match(endpoint, /baseDelayMs:\s*20/);
  assert.match(endpoint, /isolationLevel:\s*"Serializable"/);
  assert.match(endpoint, /maxWait:\s*5_?000/);
  assert.match(endpoint, /timeout:\s*15_?000/);
}

describe("finance writer attendance-fee locking", () => {
  it("locks the monthly fee identity before confirm reads or writes", () => {
    const endpoint = source("server/api/monthly-fees/[id]/confirm.ts");
    const identityRead = endpoint.indexOf("const feeIdentity = await tx.monthlyFee.findUnique");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const authoritativeRead = endpoint.indexOf("const current = await tx.monthlyFee.findUnique");
    const feeWrite = endpoint.indexOf("const claimed = await tx.monthlyFee.updateMany");

    assert.match(
      endpoint,
      /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/,
    );
    assert.match(
      endpoint,
      /const feeIdentity = await tx\.monthlyFee\.findUnique\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock read must expose only the advisory-lock identity",
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(feeWrite > authoritativeRead);
    assertBoundedSerializableWriter(endpoint);
  });

  it("locks the monthly fee identity before aggregate payment reads or writes", () => {
    const endpoint = source("server/api/monthly-fees/[id]/pay.ts");
    const identityRead = endpoint.indexOf("const feeIdentity = await tx.monthlyFee.findUnique");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const authoritativeRead = endpoint.indexOf("const fee = await tx.monthlyFee.findUnique");
    const receiptWrite = endpoint.indexOf("const receipt = await tx.receipt.create");
    const feeWrite = endpoint.indexOf("const claimed = await tx.monthlyFee.updateMany");

    assert.match(
      endpoint,
      /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/,
    );
    assert.match(
      endpoint,
      /const feeIdentity = await tx\.monthlyFee\.findUnique\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock read must expose only the advisory-lock identity",
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(receiptWrite > advisoryLock);
    assert.ok(feeWrite > advisoryLock);
    assertBoundedSerializableWriter(endpoint);
  });

  it("locks the requested student-month before receipt fee reads or writes", () => {
    const endpoint = source("server/api/receipts/index.ts");
    const transaction = endpoint.indexOf("runSerializableTransaction(prisma");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const explicitFeeRead = endpoint.indexOf("monthlyFee = await tx.monthlyFee.findFirst");
    const fallbackFeeRead = endpoint.indexOf(
      "monthlyFee = await tx.monthlyFee.findFirst",
      explicitFeeRead + 1,
    );
    const receiptWrite = endpoint.indexOf("const createdReceipt = await tx.receipt.create");
    const feeWrite = endpoint.indexOf("const linked = await tx.monthlyFee.updateMany");

    assert.match(
      endpoint,
      /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/,
    );
    assert.match(
      endpoint,
      /acquireAttendanceFeeAdvisoryLocks\(\s*tx,\s*\[body\.student_id\],\s*body\.month,?\s*\)/,
    );
    assert.ok(transaction >= 0);
    assert.ok(advisoryLock > transaction);
    assert.ok(explicitFeeRead > advisoryLock);
    assert.ok(fallbackFeeRead > advisoryLock);
    assert.ok(receiptWrite > advisoryLock);
    assert.ok(feeWrite > advisoryLock);
    assertBoundedSerializableWriter(endpoint);
  });

  it("locks the receipt student-month before deleting a receipt", () => {
    const endpoint = source("server/api/receipts/[id]/index.ts");
    const identityRead = endpoint.indexOf("const receiptIdentity = await tx.receipt.findFirst");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const authoritativeRead = endpoint.indexOf("const receipt = await tx.receipt.findFirst");
    const feeWrite = endpoint.indexOf("await tx.monthlyFee.updateMany");
    const receiptWrite = endpoint.indexOf("await tx.receipt.update");

    assert.match(
      endpoint,
      /const receiptIdentity = await tx\.receipt\.findFirst\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock read must expose only the advisory-lock identity",
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(feeWrite > authoritativeRead);
    assert.ok(receiptWrite > authoritativeRead);
    assertBoundedSerializableWriter(endpoint);
  });

  it("locks the receipt student-month before correcting a receipt", () => {
    const endpoint = source("server/api/receipts/[id]/correct.ts");
    const identityRead = endpoint.indexOf("const receiptIdentity = await tx.receipt.findFirst");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const authoritativeRead = endpoint.indexOf("const receipt = await tx.receipt.findFirst");
    const calculation = endpoint.indexOf("const calculated = await calculateFee");
    const receiptWrite = endpoint.indexOf("await tx.receipt.update");
    const lineSync = endpoint.indexOf("await syncMonthlyFeeLines");
    const aggregateRefresh = endpoint.indexOf(
      "await refreshMonthlyFeeAggregateFromLines",
    );

    assert.match(
      endpoint,
      /const receiptIdentity = await tx\.receipt\.findFirst\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock read must expose only the advisory-lock identity",
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(calculation > authoritativeRead);
    assert.ok(receiptWrite > calculation);
    assert.ok(lineSync > receiptWrite);
    assert.ok(aggregateRefresh > lineSync);
    assert.match(
      endpoint,
      /runSerializableTransaction\(\s*prisma,\s*\(tx\)\s*=>\s*correctReceiptInTransaction\(tx, id, reason/,
    );
    assertBoundedSerializableWriter(endpoint);
  });
});
