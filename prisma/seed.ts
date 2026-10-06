import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { bootstrapDatabase, provisionBusinessTenant } from "./seed-bootstrap.js";

export async function runSeed(prisma: any, env: Record<string, string | undefined> = process.env) {
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters");
  const adminPasswordHash = await bcrypt.hash(password, 12);
  const freshOwner = env.BOOTSTRAP_FRESH_PLATFORM_OWNER;
  if (freshOwner !== undefined && freshOwner !== "true" && freshOwner !== "false") throw new Error("BOOTSTRAP_FRESH_PLATFORM_OWNER must be true or false");
  const businessSlug = env.BOOTSTRAP_TENANT_SLUG;
  if (businessSlug !== undefined && (freshOwner === "true" || env.BOOTSTRAP_APPROVED_OWNER_ID !== undefined)) throw new Error("Business tenant provisioning cannot grant platform ownership");
  if (businessSlug === undefined && (env.BOOTSTRAP_TENANT_NAME !== undefined || env.BOOTSTRAP_ADMIN_USERNAME !== undefined)) throw new Error("Business tenant fields require BOOTSTRAP_TENANT_SLUG");
  const result = businessSlug !== undefined
    ? await provisionBusinessTenant(prisma, { slug: businessSlug, name: env.BOOTSTRAP_TENANT_NAME ?? "", adminUsername: env.BOOTSTRAP_ADMIN_USERNAME ?? "", adminPasswordHash })
    : await bootstrapDatabase(prisma, { adminPasswordHash, freshPlatformOwner: freshOwner === "true", approvedOwnerId: env.BOOTSTRAP_APPROVED_OWNER_ID });
  return result;
}

const entry = process.argv[1];
if (entry && pathToFileURL(entry).href === import.meta.url) {
  const prisma = new PrismaClient();
  runSeed(prisma).then((result) => console.info("Database bootstrap applied", result)).catch((error) => {
    // Prisma errors may contain credential-bearing query arguments.
    console.error("Database bootstrap failed; no credentials logged", { code: typeof error?.code === "string" ? error.code : "BOOTSTRAP_FAILED" });
    process.exitCode = 1;
  }).finally(() => prisma.$disconnect());
}
