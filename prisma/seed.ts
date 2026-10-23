import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../lib/demo-data";

loadEnvConfig(process.cwd());

const db = new PrismaClient();
seedDemo(db)
  .catch((error) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
