import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("attendance serializable retry boundaries", () => {
  it("routes every attendance-period mutation through the bounded retry helper", () => {
    const endpoint = source("server/api/attendance-periods/[id]/index.ts");
    assert.doesNotMatch(endpoint, /prisma\.\$transaction/);
    assert.ok(
      (endpoint.match(/runSerializableTransaction\(/g) || []).length >= 6,
      "submit, approve, lock, unlock, reopen and reject must all retry P2034",
    );
  });

  it("routes single and bulk attendance writes through the bounded retry helper", () => {
    for (const path of [
      "server/api/attendance/index.ts",
      "server/api/attendance/bulk.ts",
    ]) {
      const endpoint = source(path);
      assert.match(endpoint, /runSerializableTransaction\(prisma,/);
      assert.doesNotMatch(endpoint, /prisma\.\$transaction/);
    }
  });

  it("locks the class-month roster before reconciliation reads its apply plan", () => {
    const script = source("scripts/reconcile-attendance-month-ledger.ts");
    const transaction = script.indexOf("runSerializableTransaction(db");
    const rosterLock = script.indexOf("await acquireClassMonthRosterAdvisoryLocks(");
    const planRead = script.indexOf("await readPlan(tx, options, false)", rosterLock);

    assert.ok(transaction >= 0);
    assert.ok(rosterLock > transaction);
    assert.ok(planRead > rosterLock);
    assert.doesNotMatch(script, /db\.\$transaction/);
  });
});
