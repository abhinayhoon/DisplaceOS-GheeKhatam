import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

loadEnvConfig(process.cwd());

const db = new PrismaClient();

async function main() {
  const email = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  const name = process.env.OPERATOR_NAME?.trim();
  const password = process.env.OPERATOR_PASSWORD;
  const role = process.env.OPERATOR_ROLE;
  const campId = process.env.OPERATOR_CAMP_ID || null;
  if (!email || !name || !password || password.length < 12 || !["GOV_AGENCY", "RELIEF_CAMP", "RESCUE_TEAM"].includes(role ?? "")) {
    throw new Error("Set OPERATOR_EMAIL, OPERATOR_NAME, OPERATOR_PASSWORD (12+ characters), and OPERATOR_ROLE.");
  }
  if (role === "RELIEF_CAMP" && (!campId || !(await db.reliefCamp.findUnique({ where: { id: campId } })))) {
    throw new Error("A valid OPERATOR_CAMP_ID is required for a relief-camp operator.");
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name, role: role!, campId: role === "RELIEF_CAMP" ? campId : null, emailVerified: true, approved: true },
      update: { name, role: role!, campId: role === "RELIEF_CAMP" ? campId : null, emailVerified: true, approved: true },
    });
    const account = await tx.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (account) {
      await tx.account.update({ where: { id: account.id }, data: { accountId: user.id, password: passwordHash } });
    } else {
      await tx.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash } });
    }
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  console.info(`Operator account provisioned for ${email} with role ${role}.`);
}

main()
  .catch((error) => {
    console.error("Operator provisioning failed", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
