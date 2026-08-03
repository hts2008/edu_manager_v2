import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const targetArg = process.argv.indexOf("--cwd");
const target = resolve(targetArg >= 0 ? process.argv[targetArg + 1] : ".");
const waiverExpires = new Date("2026-10-31T23:59:59.999Z");
const allowedSource = 1124282;
const allowedUrl = "https://github.com/advisories/GHSA-qwww-vcr4-c8h2";
const rscPackages = [
  "@react-router/node",
  "@react-router/serve",
  "@react-router/dev",
  "react-server-dom-webpack",
  "react-server-dom-parcel",
  "react-server-dom-turbopack",
];
const rscSourcePattern = /unstable_rsc|RSCStaticRouter|RSCHydratedRouter|createCallServer|react-server-dom/;

if (Number.isNaN(waiverExpires.getTime()) || new Date() > waiverExpires) {
  throw new Error("React Router RSC audit waiver expired; reassess the dependency and architecture.");
}

const packageJson = JSON.parse(readFileSync(resolve(target, "package.json"), "utf8"));
const dependencyNames = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
]);
const forbiddenPackage = rscPackages.find((name) => dependencyNames.has(name));
if (forbiddenPackage) {
  throw new Error(`RSC package ${forbiddenPackage} invalidates the audit waiver.`);
}

function walkSource(directory) {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walkSource(path);
    } else if (/\.(?:js|jsx|ts|tsx)$/.test(entry)) {
      const source = readFileSync(path, "utf8");
      if (rscSourcePattern.test(source)) {
        throw new Error(`RSC API usage in ${path} invalidates the audit waiver.`);
      }
    }
  }
}

walkSource(resolve(target, "src"));

const audit = spawnSync("npm", ["audit", "--json"], {
  cwd: target,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (!audit.stdout) {
  throw new Error(`npm audit returned no JSON: ${audit.stderr || "unknown error"}`);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  throw new Error("npm audit returned invalid JSON.");
}

const blocking = Object.values(report.vulnerabilities || {}).filter(
  (item) => item.severity === "high" || item.severity === "critical",
);
for (const item of blocking) {
  const allowedRouter =
    item.name === "react-router" &&
    item.severity === "high" &&
    item.via?.length === 1 &&
    typeof item.via[0] === "object" &&
    item.via[0].source === allowedSource &&
    item.via[0].url === allowedUrl;
  const allowedDomPropagation =
    item.name === "react-router-dom" &&
    item.severity === "high" &&
    item.via?.length === 1 &&
    item.via[0] === "react-router";
  if (!allowedRouter && !allowedDomPropagation) {
    throw new Error(`Unwaived ${item.severity} vulnerability: ${item.name}`);
  }
}

const routerRecord = blocking.find((item) => item.name === "react-router");
const domRecord = blocking.find((item) => item.name === "react-router-dom");
if (blocking.length > 0 && (!routerRecord || !domRecord || blocking.length !== 2)) {
  throw new Error("React Router audit result no longer matches the reviewed waiver shape.");
}

console.log(
  blocking.length === 0
    ? "Frontend dependency audit passed with no high or critical vulnerabilities."
    : `Frontend audit passed with reviewed SPA-only waiver ${allowedUrl} (expires 2026-10-31).`,
);
