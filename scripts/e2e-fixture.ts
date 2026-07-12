import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bootstrapDatabase } from "../prisma/seed-bootstrap.js";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the real E2E fixture`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
const username = required("E2E_ADMIN_USERNAME");
const password = required("E2E_ADMIN_PASSWORD");
const bootstrapPassword = required("BOOTSTRAP_ADMIN_PASSWORD");

if (username !== "admin") {
  throw new Error("E2E_ADMIN_USERNAME must be admin because the bootstrap fixture owns that stable account");
}
if (password.length < 12) {
  throw new Error("E2E_ADMIN_PASSWORD must contain at least 12 characters");
}
if (bootstrapPassword !== password) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must match E2E_ADMIN_PASSWORD");
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
  const result = await bootstrapDatabase(prisma, {
    adminPasswordHash: await bcrypt.hash(bootstrapPassword, 12),
  });
  console.info("Real E2E fixture applied", result);
} finally {
  await prisma.$disconnect();
}
