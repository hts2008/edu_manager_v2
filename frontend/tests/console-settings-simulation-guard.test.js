import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";

const source = readFileSync(new URL("../src/console/SettingEditorCard.jsx", import.meta.url), "utf8");
// Exercise the component's exported pure guards without the Vite/JSX render runtime.
const helpers = source.slice(source.indexOf("function canonicalSimulationValue("), source.indexOf("export default function SettingEditorCard"));
const { settingSimulationFingerprint, createSettingSimulationGuard, settingSimulationBasis, settingSimulationSaveFields } = await import(`data:text/javascript,${encodeURIComponent(helpers)}`);
const config = { configVersion: 4, settings: [{ key: "academic.score_blend", value: { skill: 0.6 }, revision: 2 }] };

it("fingerprints scope, drafts and revisions deterministically", () => {
  assert.equal(settingSimulationFingerprint({ a: 1, b: 2 }), settingSimulationFingerprint({ b: 2, a: 1 }));
  const scope = { tenantId: "t1", classId: "c1", month: "2026-10", key: "academic.score_blend", draft: "60", revision: 2 };
  const identity = settingSimulationFingerprint(scope);
  for (const patch of [{ tenantId: "t2" }, { classId: "c2" }, { month: "2026-11" }, { key: "finance.limit" }, { draft: "70" }, { revision: 3 }]) {
    assert.notEqual(settingSimulationFingerprint({ ...scope, ...patch }), identity);
  }
  assert.notEqual(settingSimulationBasis(config).fingerprint, settingSimulationBasis({ ...config, configVersion: 5 }).fingerprint);
  assert.notEqual(settingSimulationBasis(config).fingerprint, settingSimulationBasis({ ...config, settings: [{ ...config.settings[0], revision: 3 }] }).fingerprint);
  assert.throws(() => settingSimulationBasis({ settings: [] }), /phiên bản/);
});

it("sends the exact accepted preview version, including zero, only for engine settings", () => {
  const preview = { basis: settingSimulationBasis({ ...config, configVersion: 0 }) };
  assert.deepEqual(settingSimulationSaveFields("academic", preview), { expectedConfigVersion: 0 });
  assert.deepEqual(settingSimulationSaveFields("finance", preview), { expectedConfigVersion: 0 });
  assert.deepEqual(settingSimulationSaveFields("access", preview), {});
  const laterConfig = settingSimulationBasis({ ...config, configVersion: 5 });
  assert.equal(laterConfig.configVersion, 5);
  assert.equal(settingSimulationSaveFields("academic", preview).expectedConfigVersion, 0);
  for (const version of [undefined, null, NaN, Infinity, -1, 1.5, "0"]) {
    assert.throws(() => settingSimulationSaveFields("academic", { basis: { configVersion: version } }), /phiên bản/);
  }
  assert.match(source, /\.\.\.settingSimulationSaveFields\(group, simulation\)/);
});

it("rejects stale and out-of-order completions and requires fresh basis before save", () => {
  const guard = createSettingSimulationGuard();
  const basis = settingSimulationBasis(config);
  const newerBasis = settingSimulationBasis({ ...config, configVersion: 5 });
  const old = guard.begin("draft-a");
  const current = guard.begin("draft-b");
  assert.equal(guard.accept(old, basis), false);
  assert.equal(guard.accept(current, basis), true);
  assert.equal(guard.isFresh("draft-b", { ...basis }), true);
  assert.equal(guard.isFresh("draft-a", basis), false);
  assert.equal(guard.isFresh("draft-b", newerBasis), false);
  const submit = guard.capture();
  guard.invalidate();
  assert.equal(guard.isCurrent(submit), false);
  assert.equal(guard.accept(current, basis), false);
  assert.equal(guard.isFresh("draft-b", basis), false);
});

it("submit path rechecks current config and guards programmatic saves", () => {
  assert.match(source, /if \(readOnly \|\| saving \|\| submitting \|\| simulating\) return/);
  assert.match(source, /await loadSimulationBasis\(\)/);
  assert.match(source, /simulationGuard\.current\.isFresh\(simulationIdentity, basis\)/);
  assert.match(source, /if \(submitLock\.current\) return/);
  assert.match(source, /disabled=\{readOnly \|\| saving \|\| submitting \|\| simulating \|\| simulationStale/);
});
