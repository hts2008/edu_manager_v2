import { parseAuditArguments, inventoryTuitionProgress } from "../lib/tuition-progress-audit.js";
import { bindTuitionProgressTestTarget, assertTuitionProgressDatabaseIdentity } from "../lib/tuition-progress-test-target.js";

async function main() {
  // Reject arguments and bind every datasource before importing any runtime module.
  const { target, cutoff } = parseAuditArguments(process.argv.slice(2), process.env);
  bindTuitionProgressTestTarget(process.env, target);
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } }, log: [] });
  try {
    const run = () => db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const identity = await tx.$queryRaw<Array<{ database: string; schema: string }>>`
        SELECT current_database() AS database, current_schema() AS schema`;
      assertTuitionProgressDatabaseIdentity(identity, target);
      return inventoryTuitionProgress(tx, cutoff);
    }, { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 120_000 });
    const first = await run();
    const second = await run();
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Inventory changed between dry-runs");
    process.stdout.write(`${JSON.stringify({ ...first, stableRuns: 2 }, null, 2)}\n`);
  } finally {
    await db.$disconnect();
    // Domain imports may instantiate the singleton but inventory never queries it.
    await globalThis.prisma?.$disconnect();
  }
}

main().catch(error => {
  // Database/domain errors can contain private IDs or URLs; never export their text.
  const safe = ["Inventory is read-only; apply is unsupported", "Unsupported audit argument",
    "Duplicate cutoff", "Cutoff must be UTC ISO timestamp", "Inventory changed between dry-runs"];
  process.stderr.write(`${safe.includes(error?.message) ? error.message : "Audit failed: isolated target, schema or read inputs could not be verified"}\n`);
  process.exitCode = 1;
});
