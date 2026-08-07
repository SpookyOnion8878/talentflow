import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/index";

describe("hashPassword", () => {
  it("returns a scrypt-prefixed hash", () => {
    const hash = hashPassword("secret123");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash.split(":").length).toBe(3);
  });

  it("generates unique salts for the same password", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("verifies a correct password", () => {
    const hash = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("correct-horse");
    expect(verifyPassword("wrong-horse", hash)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});
