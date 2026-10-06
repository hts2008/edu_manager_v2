import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = readFileSync(new URL("../src/console/ConsoleSystemPage.jsx", import.meta.url), "utf8");
const sectionSource = readFileSync(new URL("../src/console/ConsoleSectionPage.jsx", import.meta.url), "utf8");
const modelSource = readFileSync(new URL("../src/console/consoleSystemModel.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../src/services/api.js", import.meta.url), "utf8");
// Isolate model formatting from the Vite-only API runtime; retain the real model functions.
const transportUrl = `data:text/javascript,${encodeURIComponent("export const adminSystemService = { getStatus: async () => { throw new Error('Transport is outside formatting tests'); } };")}`;
const modelUrl = `data:text/javascript,${encodeURIComponent(modelSource.replace('"../services/api.js"', JSON.stringify(transportUrl)))}`;
const { formatLastRun, normalizeSystemStatus, summarizeEnvironment } = await import(modelUrl);

describe("Admin Console system status page", () => {
  it("normalizes missing data to safe empty collections", () => {
    assert.deepEqual(normalizeSystemStatus(null), {
      appVersion: "Không xác định",
      environment: [],
      crons: [],
      cronConfigReadable: false,
      legacyLinks: [],
    });
  });

  it("summarizes environment readiness and formats timestamps", () => {
    assert.deepEqual(summarizeEnvironment([
      { name: "A", configured: true },
      { name: "B", configured: false },
    ]), { configured: 1, missing: 1, total: 2 });
    assert.equal(formatLastRun(null), "Chưa có dữ liệu");
    assert.match(formatLastRun("2026-08-12T02:00:00.000Z"), /2026/);
  });

  it("implements explicit loading, error, empty and success states", () => {
    assert.match(pageSource, /<AsyncBoundary/);
    assert.match(pageSource, /Không có biến môi trường được theo dõi/);
    assert.match(pageSource, /Không đọc được cấu hình cron/);
    assert.match(pageSource, /Đã đặt/);
    assert.match(pageSource, /Thiếu/);
    assert.match(sectionSource, /<ConsoleSystemPage/);
    assert.match(sectionSource, /section\?\.id === "system"/);
  });

  it("loads status through the shared API client", () => {
    assert.match(modelSource, /adminSystemService/);
    assert.match(modelSource, /adminSystemService\.getStatus\(\{ signal \}\)/);
    assert.match(apiSource, /getStatus: \(options = \{\}\) => request\("\/admin\/system-status", options\)/);
    assert.match(apiSource, /localStorage\.getItem\("token"\)/);
    assert.match(apiSource, /Authorization: `Bearer \$\{token\}`/);
    assert.doesNotMatch(modelSource, /fetch\(/);
  });
});
