import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BACKUP_MANIFEST,
  getBackupManifestModelNames,
} from "../lib/backup.js";

const PRISMA_MODEL_PATTERN = /^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/gm;

async function getPrismaSchemaModelNames() {
  const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
  const schema = await readFile(schemaUrl, "utf8");
  return [...schema.matchAll(PRISMA_MODEL_PATTERN)].map((match) => match[1]).sort();
}

test("backup manifest covers every Prisma model exactly once", async () => {
  const schemaModels = await getPrismaSchemaModelNames();
  const manifestModels = getBackupManifestModelNames().sort();

  assert.deepEqual(manifestModels, schemaModels);
  assert.equal(new Set(manifestModels).size, manifestModels.length, "backup manifest contains duplicate models");
});

test("backup manifest uses unique table keys and Prisma delegates", () => {
  const keys = BACKUP_MANIFEST.map(({ key }) => key);
  const delegates = BACKUP_MANIFEST.map(({ delegate }) => delegate);

  assert.equal(new Set(keys).size, keys.length, "backup manifest contains duplicate table keys");
  assert.equal(new Set(delegates).size, delegates.length, "backup manifest contains duplicate Prisma delegates");
});
