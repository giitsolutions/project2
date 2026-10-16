import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/token";

const user = { id: "665f1c2e8a1b2c3d4e5f6a7b", email: "a@b.com", name: "Asha" };

describe("session token", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "x".repeat(40);
  });

  afterEach(() => {
    process.env.AUTH_SECRET = original;
  });

  it("round-trips a user", async () => {
    const token = await createSessionToken(user);
    expect(await verifySessionToken(token)).toEqual(user);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(user);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(user);
    process.env.AUTH_SECRET = "y".repeat(40);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("refuses to run with a short secret", async () => {
    process.env.AUTH_SECRET = "short";
    await expect(createSessionToken(user)).rejects.toThrow(/AUTH_SECRET/);
  });
});
