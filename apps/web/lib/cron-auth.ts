import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuthorizationResult =
  | "authorized"
  | "misconfigured"
  | "unauthorized";

const MINIMUM_SECRET_LENGTH = 32;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authorizeCronRequest(
  authorization: string | null,
  secret: string | undefined,
): CronAuthorizationResult {
  if (!secret || secret.trim().length < MINIMUM_SECRET_LENGTH) {
    return "misconfigured";
  }

  if (!authorization) {
    return "unauthorized";
  }

  const expected = digest(`Bearer ${secret}`);
  const provided = digest(authorization);

  return timingSafeEqual(expected, provided) ? "authorized" : "unauthorized";
}
