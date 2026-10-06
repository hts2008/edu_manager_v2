import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const testFiles = readdirSync("tests")
  .filter((name) => name.startsWith("admin-console-") && name.endsWith(".test.ts"))
  .sort()
  .map((name) => join("tests", name));

testFiles.push(
  join("tests", "settings-registry.test.ts"),
  join("tests", "settings-resolver.test.ts"),
);

const tsxCli = join("node_modules", "tsx", "dist", "cli.mjs");
const result = spawnSync(process.execPath, [tsxCli, "--test", ...testFiles], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
