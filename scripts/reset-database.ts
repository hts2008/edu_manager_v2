import { PrismaClient } from "@prisma/client";
import { resetDatabase } from "../prisma/reset-database.js";

const prisma = new PrismaClient();
resetDatabase(prisma, { databaseUrl: process.env.DATABASE_URL, confirmation: process.env.RESET_CONFIRMATION, nodeEnv: process.env.NODE_ENV })
  .then(() => console.info("Local/test database reset completed"))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
