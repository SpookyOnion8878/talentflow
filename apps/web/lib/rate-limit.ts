type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

/**
 * Client IP for rate limiting. X-Forwarded-For is client-controlled; only
 * honor it when TRUSTED_PROXY=true (i.e. a reverse proxy sanitizes the
 * header). Otherwise every caller shares the "unknown" bucket — consistent
 * with lib/auth.ts.
 */
export function getClientIp(headers: Headers): string {
  if (process.env.TRUSTED_PROXY !== "true") return "unknown";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
