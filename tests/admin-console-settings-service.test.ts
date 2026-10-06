import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSetting,
  getSettings,
  getSettingHistory,
  rollbackSetting,
  updateSetting,
  type SettingsDatabase,
} from "../lib/settings.js";

type Row = {
  id: string;
  tenantId: string;
  key: string;
  value: unknown;
  effectiveFromMonth: string | null;
  revision: number;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
};

function createHarness(seed: Row[] = []) {
  const rows = seed.map((row) => ({ ...row }));
  const revisions: any[] = [];
  const activity: any[] = [];
  let configVersion = 3;
  let settingFindManyCount = 0;
  let transactionCount = 0;

  const tx: any = {
    tenant: {
      findUnique: async () => ({ configVersion }),
      update: async () => ({ configVersion: ++configVersion }),
    },
    settingValue: {
      findMany: async ({ where }: any) => {
        settingFindManyCount += 1;
        return rows.filter((row) =>
          row.tenantId === where.tenantId && (!where.key || row.key === where.key),
        );
      },
      findFirst: async ({ where }: any) =>
        rows.find((row) =>
          row.tenantId === where.tenantId &&
          row.key === where.key &&
          row.effectiveFromMonth === where.effectiveFromMonth,
        ) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `setting-${rows.length + 1}`,
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          updatedAt: new Date("2026-08-12T00:00:00.000Z"),
          ...data,
        };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((candidate) => candidate.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date("2026-08-12T00:00:00.000Z") });
        return row;
      },
    },
    settingRevision: {
      findMany: async ({ where, skip, take }: any) =>
        revisions
          .filter((revision) =>
            revision.tenantId === where.tenantId &&
            (!where.settingValueId?.in || where.settingValueId.in.includes(revision.settingValueId)),
          )
          .slice(skip, skip + take),
      count: async ({ where }: any) =>
        revisions.filter((revision) =>
          revision.tenantId === where.tenantId &&
          (!where.settingValueId?.in || where.settingValueId.in.includes(revision.settingValueId)),
        ).length,
      findFirst: async ({ where }: any) =>
        revisions.find((revision) =>
          revision.tenantId === where.tenantId &&
          revision.id === where.id &&
          (!where.settingValueId?.in || where.settingValueId.in.includes(revision.settingValueId)),
        ) ?? null,
      create: async ({ data }: any) => {
        const revision = {
          id: `revision-${revisions.length + 1}`,
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          ...data,
        };
        revisions.push(revision);
        return revision;
      },
    },
    activityLog: {
      create: async ({ data }: any) => {
        activity.push(data);
        return { id: activity.length, ...data };
      },
    },
  };

  const db: SettingsDatabase = {
    ...tx,
    $transaction: async (operation: (client: any) => Promise<unknown>) => {
      transactionCount += 1;
      return operation(tx);
    },
  } as SettingsDatabase;

  return {
    activity,
    db,
    revisions,
    rows,
    get configVersion() { return configVersion; },
    setConfigVersion(value: number) { configVersion = value; },
    get settingFindManyCount() { return settingFindManyCount; },
    get transactionCount() { return transactionCount; },
  };
}

function row(overrides: Partial<Row>): Row {
  return {
    id: "setting-1",
    tenantId: "tenant-a",
    key: "finance.bulk_actions_max",
    value: 100,
    effectiveFromMonth: null,
    revision: 1,
    updatedById: "admin-a",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("Admin Console settings service", () => {
  it("resolves DB overrides by tenant/month and lists registry metadata", async () => {
    const harness = createHarness([
      row({ key: "finance.chargeable_statuses", value: ["present"], effectiveFromMonth: "2026-08" }),
      row({ id: "setting-2", key: "finance.chargeable_statuses", value: ["present", "absent_with_fee"], effectiveFromMonth: "2026-10", revision: 2 }),
      row({ id: "setting-b", tenantId: "tenant-b", value: 999 }),
    ]);

    const resolved = await getSetting(harness.db, {
      tenantId: "tenant-a",
      key: "finance.chargeable_statuses",
      effectiveMonth: "2026-09",
    });
    const listed = await getSettings(harness.db, {
      tenantId: "tenant-a",
      group: "finance",
      effectiveMonth: "2026-09",
    });

    assert.deepEqual(resolved.value, ["present"]);
    assert.equal(resolved.provenance, "tenant_effective");
    assert.equal(listed.configVersion, 3);
    assert.ok(listed.settings.every((entry) => entry.definition.group === "finance"));
    assert.equal(listed.settings.find((entry) => entry.key === "finance.chargeable_statuses")?.sourceId, "setting-1");
  });

  it("falls back to the registry default with a structured warning for invalid stored JSON", async () => {
    const harness = createHarness([row({ value: 0 })]);

    const resolved = await getSetting(harness.db, {
      tenantId: "tenant-a",
      key: "finance.bulk_actions_max",
    });

    assert.equal(resolved.value, 100);
    assert.equal(resolved.provenance, "registry_default");
    assert.deepEqual(resolved.warnings?.map((warning) => warning.code), ["INVALID_STORED_VALUE"]);
    assert.equal(resolved.warnings?.[0].sourceId, "setting-1");
  });

  it("reuses tenant settings until configVersion changes", async () => {
    const harness = createHarness([row({ value: 100 })]);

    await getSetting(harness.db, { tenantId: "tenant-a", key: "finance.bulk_actions_max" });
    await getSetting(harness.db, { tenantId: "tenant-a", key: "finance.bulk_actions_max" });
    assert.equal(harness.settingFindManyCount, 1);

    harness.setConfigVersion(4);
    await getSetting(harness.db, { tenantId: "tenant-a", key: "finance.bulk_actions_max" });
    assert.equal(harness.settingFindManyCount, 2);
  });

  it("writes value, revision, config version, and audit diff atomically", async () => {
    const harness = createHarness();

    const result = await updateSetting(harness.db, {
      tenantId: "tenant-a",
      actorId: "admin-a",
      key: "finance.chargeable_statuses",
      value: ["present", "absent_with_fee"],
      effectiveFromMonth: "2026-09",
      changeNote: "Apply from September",
      now: new Date("2026-08-12T00:00:00.000Z"),
    });

    assert.equal(harness.transactionCount, 1);
    assert.equal(result.revision, 1);
    assert.equal(harness.revisions.length, 1);
    assert.equal(harness.configVersion, 4);
    assert.equal(harness.activity.length, 1);
    assert.match(harness.activity[0].action, /"type":"setting.update"/);
    assert.match(harness.activity[0].action, /"oldValue":null/);
    assert.match(harness.activity[0].action, /"newValue":\["present","absent_with_fee"\]/);
  });

  it("rejects unknown/read-only/invalid/retroactive writes", async () => {
    const harness = createHarness();

    await assert.rejects(
      updateSetting(harness.db, { tenantId: "tenant-a", actorId: "admin-a", key: "missing.key", value: true }),
      (error: any) => error.code === "UNKNOWN_SETTING" && error.status === 400,
    );
    await assert.rejects(
      updateSetting(harness.db, { tenantId: "tenant-a", actorId: "admin-a", key: "organization.business_timezone", value: "Asia/Ho_Chi_Minh" }),
      (error: any) => error.code === "SETTING_READ_ONLY",
    );
    await assert.rejects(
      updateSetting(harness.db, { tenantId: "tenant-a", actorId: "admin-a", key: "finance.bulk_actions_max", value: 0 }),
      (error: any) => error.code === "INVALID_SETTING_VALUE" && error.details.issues[0].path === "value",
    );
    await assert.rejects(
      updateSetting(harness.db, {
        tenantId: "tenant-a", actorId: "admin-a", key: "finance.chargeable_statuses",
        value: ["present"], effectiveFromMonth: "2026-07", now: new Date("2026-08-12T00:00:00.000Z"),
      }),
      (error: any) => error.code === "EFFECTIVE_MONTH_IN_PAST",
    );
    await assert.rejects(
      updateSetting(harness.db, {
        tenantId: "tenant-a", actorId: "admin-a", key: "finance.bulk_actions_max",
        value: 100, changeNote: "x".repeat(501),
      }),
      (error: any) => error.code === "INVALID_CHANGE_NOTE" && error.status === 400,
    );
  });

  it("returns scoped paginated history and rolls a revision forward as a new revision", async () => {
    const harness = createHarness([row({ value: 200, revision: 2 })]);
    harness.revisions.push(
      { id: "revision-1", tenantId: "tenant-a", settingValueId: "setting-1", revision: 1, oldValue: 100, newValue: 150, changeNote: null, changedById: "admin-a", createdAt: new Date("2026-08-01") },
      { id: "revision-2", tenantId: "tenant-a", settingValueId: "setting-1", revision: 2, oldValue: 150, newValue: 200, changeNote: null, changedById: "admin-a", createdAt: new Date("2026-08-02") },
    );

    const history = await getSettingHistory(harness.db, {
      tenantId: "tenant-a", key: "finance.bulk_actions_max", page: 1, pageSize: 1,
    });
    const rolledBack = await rollbackSetting(harness.db, {
      tenantId: "tenant-a", actorId: "admin-a", key: "finance.bulk_actions_max",
      revisionId: "revision-1", changeNote: "Restore known limit",
    });

    assert.equal(history.total, 2);
    assert.equal(history.revisions.length, 1);
    assert.equal(rolledBack.value, 100);
    assert.equal(rolledBack.revision, 3);
    assert.equal(harness.revisions.length, 3);
    assert.equal(harness.rows[0].value, 100);
    assert.match(harness.activity.at(-1).action, /"type":"setting.rollback"/);
  });

  it("restores the registry default when rolling back the first override", async () => {
    const harness = createHarness([row({ value: 150, revision: 1 })]);
    harness.revisions.push({
      id: "revision-1",
      tenantId: "tenant-a",
      settingValueId: "setting-1",
      revision: 1,
      oldValue: null,
      newValue: 150,
      changeNote: null,
      changedById: "admin-a",
      createdAt: new Date("2026-08-01"),
    });

    const rolledBack = await rollbackSetting(harness.db, {
      tenantId: "tenant-a",
      actorId: "admin-a",
      key: "finance.bulk_actions_max",
      revisionId: "revision-1",
      changeNote: "Restore system default",
    });

    assert.equal(rolledBack.value, 100);
    assert.equal(rolledBack.revision, 2);
    assert.equal(harness.rows[0].value, 100);
  });
});
