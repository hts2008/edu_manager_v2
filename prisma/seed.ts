import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bootstrapDatabase } from "./seed-bootstrap.js";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters");
  const result = await bootstrapDatabase(prisma, { adminPasswordHash: await bcrypt.hash(password, 12) });
  console.info("Database bootstrap applied", result);
}

main().catch((error) => {
  console.error("Database bootstrap failed", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
