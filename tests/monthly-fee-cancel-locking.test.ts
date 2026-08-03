import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const endpoint = readFileSync(
  new URL("../server/api/monthly-fees/[id]/cancel.ts", import.meta.url),
  "utf8",
);

describe("monthly fee cancel locking contract", () => {
  it("locks the student-month before the authoritative read and conditional update", () => {
    const identityRead = endpoint.indexOf(
      "const feeIdentity = await tx.monthlyFee.findUnique",
    );
    const advisoryLock = endpoint.indexOf(
      "await acquireAttendanceFeeAdvisoryLocks(",
    );
    const authoritativeRead = endpoint.indexOf(
      "const current = await tx.monthlyFee.findUnique",
    );
    const conditionalUpdate = endpoint.indexOf(
      "const released = await tx.monthlyFee.updateMany",
    );
    const resultRead = endpoint.indexOf(
      "return tx.monthlyFee.findUniqueOrThrow",
    );

    assert.match(
      endpoint,
      /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/,
    );
    assert.match(
      endpoint,
      /const feeIdentity = await tx\.monthlyFee\.findUnique\([\s\S]*?select:\s*\{\s*studentId:\s*true,\s*month:\s*true\s*\}/,
      "the pre-lock read must expose only the advisory-lock identity",
    );
    assert.match(
      endpoint,
      /const current = await tx\.monthlyFee\.findUnique\(\{[\s\S]*?include:\s*\{\s*lines:\s*\{\s*select:\s*\{\s*id:\s*true\s*\},\s*take:\s*1\s*\}\s*\}/,
      "the authoritative read must include enough class-line state to reject aggregate cancellation",
    );
    assert.match(endpoint, /assertAggregatePaymentAllowed\(current\)/);
    assert.ok(
      endpoint.indexOf("assertAggregatePaymentAllowed(current)") > authoritativeRead,
      "the aggregate guard must run after the locked authoritative read",
    );
    assert.ok(
      conditionalUpdate > endpoint.indexOf("assertAggregatePaymentAllowed(current)"),
      "the aggregate guard must run before any cancellation mutation",
    );
    assert.match(
      endpoint,
      /acquireAttendanceFeeAdvisoryLocks\(\s*tx,\s*\[feeIdentity\.studentId\],\s*feeIdentity\.month,?\s*\)/,
    );
    assert.ok(identityRead >= 0);
    assert.ok(advisoryLock > identityRead);
    assert.ok(authoritativeRead > advisoryLock);
    assert.ok(conditionalUpdate > authoritativeRead);
    assert.ok(resultRead > conditionalUpdate);
    assert.match(
      endpoint,
      /const released = await tx\.monthlyFee\.updateMany\(\{[\s\S]*?where:\s*\{[\s\S]*?id,[\s\S]*?status:\s*"confirmed",[\s\S]*?receiptId:\s*null,[\s\S]*?paidAt:\s*null,[\s\S]*?\},[\s\S]*?data:\s*\{\s*status:\s*"ready"\s*\}/,
      "cancel must conditionally claim only an unpaid, unlinked confirmed fee",
    );
  });

  it("uses bounded Serializable retries for P2034 conflicts", () => {
    assert.match(endpoint, /runSerializableTransaction\(prisma,/);
    assert.match(endpoint, /maxAttempts:\s*3/);
    assert.match(endpoint, /baseDelayMs:\s*20/);
    assert.match(endpoint, /isolationLevel:\s*"Serializable"/);
    assert.match(endpoint, /maxWait:\s*5_?000/);
    assert.match(endpoint, /timeout:\s*15_?000/);
  });
});
