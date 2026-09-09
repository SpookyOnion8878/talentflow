import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron-auth";

const SECRET = "a-secure-cron-secret-with-at-least-32-characters";

describe("authorizeCronRequest", () => {
  it("fails closed when the secret is missing or too short", () => {
    expect(authorizeCronRequest(null, undefined)).toBe("misconfigured");
    expect(authorizeCronRequest("Bearer short", "short")).toBe("misconfigured");
  });

  it("rejects missing and invalid authorization headers", () => {
    expect(authorizeCronRequest(null, SECRET)).toBe("unauthorized");
    expect(authorizeCronRequest("Bearer wrong-secret", SECRET)).toBe(
      "unauthorized",
    );
  });

  it("accepts only the exact bearer token", () => {
    expect(authorizeCronRequest(`Bearer ${SECRET}`, SECRET)).toBe("authorized");
  });
});
