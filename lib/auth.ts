import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { OPERATORS, type Operator, type Role } from "@/lib/types";

export const SESSION_COOKIE = "displaceos_session";
const TTL_S = 60 * 60 * 12;
const SECRET = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "displaceos-dev-secret-change-me";

// Demo passcodes. Stored as scrypt hashes at module load; never shipped to the client bundle.
const PASSCODES: Record<string, string> = {
  "NDMA-CMD-01": "NDMA-2026",
  "CAMP-ALPHA-04": "CAMP-2026",
  "NDRF-UNIT-09": "NDRF-2026",
};
const SALT = "displaceos-operator-salt";
const hash = (s: string) => scryptSync(s, SALT, 32);
const HASHES = Object.fromEntries(Object.entries(PASSCODES).map(([k, v]) => [k, hash(v)]));

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export type SessionUser = { badgeId: string; name: string; role: Role; campName: string | null };

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("base64url");

export function signSession(badgeId: string) {
  const body = b64(JSON.stringify({ b: badgeId, e: Math.floor(Date.now() / 1000) + TTL_S }));
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string | undefined): Operator | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = sign(body);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const { b, e } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof e !== "number" || e < Date.now() / 1000) return null;
    return OPERATORS.find((o) => o.badgeId === b) ?? null;
  } catch {
    return null;
  }
}

export function checkCredentials(badgeId: string, passcode: string): Operator | null {
  const op = OPERATORS.find((o) => o.badgeId === badgeId.trim().toUpperCase());
  if (!op) return null;
  const ok = timingSafeEqual(HASHES[op.badgeId], hash(passcode));
  return ok ? op : null;
}

export function toSessionUser(op: Operator): SessionUser {
  return { badgeId: op.badgeId, name: op.name, role: op.role, campName: op.campName };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Per-tab token (sessionStorage) wins over the shared cookie so two tabs can hold different roles.
  const tabToken = (await headers()).get("x-displaceos-token") || undefined;
  const op = verifySession(tabToken) ?? verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return op ? toSessionUser(op) : null;
}

export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError(401, "Not signed in");
  if (roles.length && !roles.includes(u.role)) throw new AuthError(403, `Requires role: ${roles.join(" or ")}`);
  return u;
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_S,
};
