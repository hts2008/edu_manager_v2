import { BACKUP_MANIFEST } from "../lib/backup.js";

export function assertDestructiveResetAllowed(options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  if (options.confirmation !== "RESET_EDU_MANAGER") throw new Error("Set RESET_CONFIRMATION=RESET_EDU_MANAGER to authorize destructive reset");
  let hostname = "";
  let database = "";
  try { const url = new URL(options.databaseUrl ?? ""); hostname = url.hostname; database = url.pathname.toLowerCase(); } catch { /* rejected below */ }
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const testTarget = options.nodeEnv === "test" && /test|audit/.test(database);
  if (!localHost && !testTarget) throw new Error("Destructive reset is restricted to localhost or explicitly test-named databases");
}

export async function resetDatabase(prisma: any, options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  assertDestructiveResetAllowed(options);
  await prisma.$transaction(async (tx: any) => {
    const reset = async () => {
      for (const { delegate } of [...BACKUP_MANIFEST].reverse()) await tx[delegate].deleteMany();
    };
    if (typeof tx.$executeRawUnsafe !== "function") return reset();

    const tables = ["class_month_plan_revisions", "monthly_fee_line_revisions"];
    let replicaMode = false;
    try {
      await tx.$executeRawUnsafe("SAVEPOINT reset_trigger_mode");
      try {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        replicaMode = true;
      } catch {
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT reset_trigger_mode");
        for (const table of tables) await tx.$executeRawUnsafe(`ALTER TABLE \"${table}\" DISABLE TRIGGER USER`);
      } finally {
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT reset_trigger_mode");
      }
      try {
        await reset();
      } finally {
        if (!replicaMode) for (const table of tables) await tx.$executeRawUnsafe(`ALTER TABLE \"${table}\" ENABLE TRIGGER USER`);
      }
    } catch (error) {
      throw new Error(`Could not prepare immutable-trigger handling for reset: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
