import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SETTINGS_REGISTRY,
  SETTING_GROUPS,
  SETTING_PERMISSIONS,
  getSettingDefinition,
  parseSettingValue,
} from "../lib/settings-registry.js";

describe("admin console settings registry", () => {
  it("contains unique, addressable V1 keys", () => {
    const keys = SETTINGS_REGISTRY.map((definition) => definition.key);

    assert.equal(new Set(keys).size, keys.length);
    for (const definition of SETTINGS_REGISTRY) {
      assert.equal(getSettingDefinition(definition.key), definition);
    }
  });

  it("keeps every default valid under its own Zod schema", () => {
    for (const definition of SETTINGS_REGISTRY) {
      assert.deepEqual(
        parseSettingValue(definition.key, definition.defaultValue),
        definition.defaultValue,
        `${definition.key} default must parse without normalization`,
      );
    }
  });

  it("requires an effective month for every financial or academic setting", () => {
    for (const definition of SETTINGS_REGISTRY) {
      if (definition.impact === "financial" || definition.impact === "academic") {
        assert.equal(
          definition.requiresEffectiveMonth,
          true,
          `${definition.key} must be versioned by effective month`,
        );
      }
    }
  });

  it("uses only approved group and permission metadata", () => {
    for (const definition of SETTINGS_REGISTRY) {
      assert.ok(SETTING_GROUPS.includes(definition.group));
      assert.ok(SETTING_PERMISSIONS.includes(definition.permission));
      assert.equal(definition.key.startsWith(`${definition.group}.`), true);
    }
  });

  it("locks sourced defaults and deliberately excludes the unsourced reminder due day", () => {
    assert.deepEqual(parseSettingValue("finance.chargeable_statuses", ["present", "absent_with_fee"]), [
      "present",
      "absent_with_fee",
    ]);
    assert.deepEqual(getSettingDefinition("finance.default_session_days").defaultValue, [1, 2, 3, 4, 5, 6]);
    assert.equal(getSettingDefinition("finance.bulk_pay_max_lines").defaultValue, 500);
    assert.equal(getSettingDefinition("finance.bulk_actions_max").defaultValue, 100);
    assert.equal(getSettingDefinition("finance.class_default_max_students").defaultValue, 50);
    assert.deepEqual(getSettingDefinition("academic.score_blend").defaultValue, {
      skill: 0.6,
      attendance: 0.25,
      consistency: 0.15,
    });
    assert.deepEqual(getSettingDefinition("access.login_rate_limit").defaultValue, {
      windowMs: 900_000,
      max: 10,
    });
    assert.equal(getSettingDefinition("flags.fee_reminders_enabled").defaultValue, false);
    assert.equal(getSettingDefinition("organization.business_timezone").readOnly, true);
    assert.throws(
      () => getSettingDefinition("finance.reminder_due_day"),
      /Unknown setting key/,
      "the PRD explicitly leaves reminder_due_day unsourced",
    );
  });

  it("rejects invalid values instead of coercing configuration", () => {
    assert.throws(() => parseSettingValue("finance.bulk_actions_max", 0));
    assert.throws(() => parseSettingValue("academic.score_blend", {
      skill: 0.5,
      attendance: 0.5,
      consistency: 0.5,
    }));
    assert.throws(() => parseSettingValue("access.login_rate_limit", {
      windowMs: 0,
      max: 10,
    }));
  });
});
