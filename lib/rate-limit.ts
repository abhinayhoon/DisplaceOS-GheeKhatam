const hits = new Map<string, { n: number; reset: number }>();

export function rateLimited(req: Request, key: string, limit = 10, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const e = hits.get(k);
  if (!e || e.reset < now) {
    hits.set(k, { n: 1, reset: now + windowMs });
    return false;
  }
  e.n += 1;
  return e.n > limit;
}
