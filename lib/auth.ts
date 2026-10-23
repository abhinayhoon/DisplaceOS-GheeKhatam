import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { OPERATORS, type Role } from "@/lib/types";

export const SESSION_COOKIE = "displaceos_session";
const TTL_S = 60 * 60 * 12;

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export type SessionUser = {
  id: string;
  badgeId: string;
  name: string;
  email: string;
  role: Role;
  campId: string | null;
  campName: string | null;
};

type Claims = SessionUser & { exp: number };

function secret() {
  const value = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("Set BETTER_AUTH_SECRET to a random value of at least 32 characters.");
  return value;
}

export function isDemoModeEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function signSession(user: SessionUser) {
  const body = b64(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + TTL_S } satisfies Claims));
  return `${body}.${sign(body)}`;
}

export async function createSession(user: SessionUser) {
  const token = signSession(user);
  if (!user.id.startsWith("demo:")) {
    await prisma.session.create({
      data: { token, expiresAt: new Date(Date.now() + TTL_S * 1000), userId: user.id },
    });
    void prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch((error) => {
      console.error("Expired session cleanup failed", error);
    });
  }
  return token;
}

export function verifySession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra || !/^[A-Za-z0-9_-]+$/.test(sig)) return null;
  try {
    const expected = Buffer.from(sign(body));
    const supplied = Buffer.from(sig);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Claims>;
    if (typeof claims.exp !== "number" || claims.exp < Date.now() / 1000) return null;
    if (typeof claims.id !== "string" || typeof claims.badgeId !== "string" || typeof claims.name !== "string" || typeof claims.email !== "string") return null;
    if (!["GOV_AGENCY", "RELIEF_CAMP", "RESCUE_TEAM"].includes(String(claims.role))) return null;
    if (claims.campId !== null && typeof claims.campId !== "string") return null;
    if (claims.campName !== null && typeof claims.campName !== "string") return null;
    return {
      id: claims.id,
      badgeId: claims.badgeId,
      name: claims.name,
      email: claims.email,
      role: claims.role as Role,
      campId: claims.campId ?? null,
      campName: claims.campName ?? null,
    };
  } catch {
    return null;
  }
}

export async function authenticate(input: { email?: unknown; password?: unknown; demoBadgeId?: unknown }): Promise<SessionUser | null> {
  if (typeof input.demoBadgeId === "string" && isDemoModeEnabled()) {
    const op = OPERATORS.find((candidate) => candidate.badgeId === input.demoBadgeId);
    if (op) {
      const camp = op.campName ? await prisma.reliefCamp.findFirst({ where: { name: op.campName } }) : null;
      return {
        id: `demo:${op.badgeId}`,
        badgeId: op.badgeId,
        name: op.name,
        email: `${op.badgeId.toLowerCase()}@demo.invalid`,
        role: op.role,
        campId: camp?.id ?? null,
        campName: camp?.name ?? op.campName,
      };
    }
  }

  if (typeof input.email !== "string" || typeof input.password !== "string") return null;
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || input.password.length > 128) return null;
  const user = await prisma.user.findUnique({ where: { email }, include: { accounts: { where: { providerId: "credential" } } } });
  const account = user?.accounts[0];
  if (!user?.approved || !account?.password || !(await verifyPassword({ hash: account.password, password: input.password }))) return null;
  const camp = user.campId ? await prisma.reliefCamp.findUnique({ where: { id: user.campId } }) : null;
  return {
    id: user.id,
    badgeId: user.email,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    campId: user.campId,
    campName: camp?.name ?? null,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookieToken) return null;
  const claims = verifySession(cookieToken);
  if (!claims) return null;
  if (claims.id.startsWith("demo:")) return isDemoModeEnabled() ? claims : null;
  const session = await prisma.session.findUnique({ where: { token: cookieToken } });
  if (!session || session.userId !== claims.id || session.expiresAt <= new Date()) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.id } });
  if (!user?.approved || !["GOV_AGENCY", "RELIEF_CAMP", "RESCUE_TEAM"].includes(user.role)) return null;
  const camp = user.campId ? await prisma.reliefCamp.findUnique({ where: { id: user.campId } }) : null;
  return {
    id: user.id,
    badgeId: user.email,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    campId: user.campId,
    campName: camp?.name ?? null,
  };
}

export async function revokeSession(token: string | undefined) {
  const claims = verifySession(token);
  if (!claims || claims.id.startsWith("demo:")) return;
  await prisma.session.deleteMany({ where: { token, userId: claims.id } });
}

export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "Not signed in");
  if (roles.length && !roles.includes(user.role)) throw new AuthError(403, `Requires role: ${roles.join(" or ")}`);
  return user;
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_S,
};
