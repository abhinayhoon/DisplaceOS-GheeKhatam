const LOCAL_DATABASE_HELP =
  "Start PostgreSQL with `docker compose up -d postgres`, then run `npm run db:migrate` and `npm run db:seed`.";

export type ServiceReadinessIssue = "database" | "database_credentials" | "schema" | "secret";

export function serviceReadinessMessage(issue: ServiceReadinessIssue) {
  if (process.env.NODE_ENV === "production") {
    return "The service is temporarily unavailable. Contact the system administrator.";
  }

  if (issue === "database") return `The database is not reachable. ${LOCAL_DATABASE_HELP}`;
  if (issue === "database_credentials") return "PostgreSQL rejected the configured credentials. Check DATABASE_URL in .env and restart the app.";
  if (issue === "schema") return "The database is missing application tables. Run `npm run db:migrate` and `npm run db:seed`.";
  return "BETTER_AUTH_SECRET is missing or too short. Set a private value of at least 32 characters in .env and restart the app.";
}

function prismaCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  return { code, name };
}

export function serviceFailureMessage(error: unknown, fallback: string) {
  const info = prismaCode(error);
  if (!info) return fallback;

  if (info.code === "P1000") return serviceReadinessMessage("database_credentials");
  if (["P1001", "P1002", "P1003", "P1017"].includes(info.code ?? "") || info.name === "PrismaClientInitializationError") {
    return serviceReadinessMessage("database");
  }
  if (["P2021", "P2022"].includes(info.code ?? "")) return serviceReadinessMessage("schema");
  return fallback;
}

export function serviceFailureStatus(error: unknown): 500 | 503 {
  const info = prismaCode(error);
  return info && (info.name === "PrismaClientInitializationError" ||
    ["P1000", "P1001", "P1002", "P1003", "P1017", "P2021", "P2022"].includes(info.code ?? ""))
    ? 503
    : 500;
}
