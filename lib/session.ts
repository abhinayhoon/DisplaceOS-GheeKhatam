import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export type SessionUser = { id: string; name: string; email: string; role: Role; campId: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string; campId?: string | null };
  return { id: u.id, name: u.name, email: u.email, role: (u.role ?? "RELIEF_CAMP") as Role, campId: u.campId ?? null };
}

export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError(401, "Not signed in");
  if (roles.length && !roles.includes(u.role)) throw new AuthError(403, `Requires role: ${roles.join(" or ")}`);
  return u;
}
