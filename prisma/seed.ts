import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../lib/demo-data";

const db = new PrismaClient();
seedDemo(db).finally(() => db.$disconnect());
