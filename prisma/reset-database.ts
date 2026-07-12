import { BACKUP_MANIFEST } from "../lib/backup.js";

export function assertDestructiveResetAllowed(options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  if (options.confirmation !== "RESET_EDU_MANAGER") throw new Error("Set RESET_CONFIRMATION=RESET_EDU_MANAGER to authorize destructive reset");
  let hostname = "";
  let database = "";
  try { const url = new URL(options.databaseUrl ?? ""); hostname = url.hostname; database = url.pathname.toLowerCase(); } catch { /* rejected below */ }
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const testTarget = options.nodeEnv === "test" && /test/.test(database);
  if (!localHost && !testTarget) throw new Error("Destructive reset is restricted to localhost or test-named databases");
}

export async function resetDatabase(prisma: any, options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  assertDestructiveResetAllowed(options);
  await prisma.$transaction(async (tx: any) => {
    for (const { delegate } of [...BACKUP_MANIFEST].reverse()) await tx[delegate].deleteMany();
  });
}
