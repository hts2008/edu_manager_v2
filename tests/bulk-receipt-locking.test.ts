import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function functionSource(endpoint: string, name: string, nextName: string) {
  const start = endpoint.indexOf(`async function ${name}`);
  const end = endpoint.indexOf(`async function ${nextName}`, start);
  assert.ok(start >= 0, `${name} must exist`);
  assert.ok(end > start, `${nextName} must follow ${name}`);
  return endpoint.slice(start, end);
}

describe("bulk receipt deletion locking", () => {
  it("uses the bounded serializable retry helper for student and receipt mutations", () => {
    const endpoint = source("server/api/bulk-actions/index.ts");
    const archiveStudent = functionSource(endpoint, "archiveStudent", "deleteStudent");
    const deleteStudent = functionSource(endpoint, "deleteStudent", "deleteParent");
    const deleteReceipt = functionSource(endpoint, "deleteReceipt", "deletePayment");

    assert.doesNotMatch(endpoint, /prisma\.\$transaction/);
    for (const mutation of [archiveStudent, deleteStudent, deleteReceipt]) {
      assert.match(mutation, /runSerializableTransaction\(prisma,/);
      assert.match(mutation, /BULK_ACTION_TRANSACTION_OPTIONS/);
    }

    assert.match(endpoint, /maxAttempts:\s*3/);
    assert.match(endpoint, /baseDelayMs:\s*20/);
    assert.match(endpoint, /isolationLevel:\s*"Serializable"/);
    assert.match(endpoint, /maxWait:\s*5_?000/);
    assert.match(endpoint, /timeout:\s*15_?000/);

    for (const mutation of [archiveStudent, deleteStudent]) {
      const deactivate = mutation.indexOf("await deactivateEnrollmentPeriods(tx");
      const studentWrite = mutation.indexOf("await tx.student.update");
      assert.ok(deactivate >= 0, "student enrollment periods must still be deactivated");
      assert.ok(studentWrite > deactivate, "student status update must follow enrollment deactivation");
    }
  });

  it("locks the receipt student-month before authoritative reads and conditional writes", () => {
    const endpoint = source("server/api/bulk-actions/index.ts");
    const mutation = functionSource(endpoint, "deleteReceipt", "deletePayment");
    const identityRead = mutation.indexOf(
      "const receiptIdentity = await tx.receipt.findFirst",
    );
    const advisoryLock = mutation.indexOf(
      "await acquireAttendanceFeeAdvisoryLocks(",
    );
    const authoritativeRead = mutation.indexOf(
      "const receipt = await tx.receipt.findFirst",
      identityRead + 1,
    );
    const feeWrite = mutation.indexOf("await tx.monthlyFee.updateMany");
    const receiptWrite = mutation.indexOf("const claimed = await tx.receipt.updateMany");

    assert.match(
      endpoint,
      /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/,
    );
    assert.match(
      endpoint,
      /import \{ runSerializableTransaction \} from "\.\.\/\.\.\/\.\.\/lib\/serializable-transaction\.js"/,
    );
    assert.match(
      mutation,
      /const receiptIdentity = await tx\.receipt\.findFirst\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock lookup must read only the student-month lock identity",
    );
    assert.match(
      mutation,
      /acquireAttendanceFeeAdvisoryLocks\(\s*tx,\s*\[receiptIdentity\.studentId\],\s*receiptIdentity\.month,?\s*\)/,
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(feeWrite > authoritativeRead);
    assert.ok(receiptWrite > feeWrite);
    assert.match(
      mutation,
      /monthlyFee\.updateMany\([\s\S]*?where:\s*\{\s*receiptId:\s*receipt\.id\s*\}/,
      "fee unlinking must remain conditional on the authoritative receipt id",
    );
    assert.match(
      mutation,
      /const claimed = await tx\.receipt\.updateMany\([\s\S]*?where:\s*\{[\s\S]*?id:\s*receipt\.id,[\s\S]*?deletedAt:\s*null[\s\S]*?\}/,
      "receipt soft-delete must claim only an active authoritative row",
    );
    assert.match(mutation, /if \(claimed\.count !== 1\)/);
    assert.match(mutation, /RECEIPT_STATE_CONFLICT/);
  });
});
