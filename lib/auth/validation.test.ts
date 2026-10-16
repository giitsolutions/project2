import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/auth/validation";

describe("signupSchema", () => {
  it("trims and lowercases", () => {
    const parsed = signupSchema.parse({
      name: "  Asha  ",
      email: "  Asha@Example.COM ",
      password: "longenough",
    });
    expect(parsed.name).toBe("Asha");
    expect(parsed.email).toBe("asha@example.com");
  });

  it("rejects short passwords", () => {
    const result = signupSchema.safeParse({
      name: "Asha",
      email: "a@b.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = signupSchema.safeParse({
      name: "Asha",
      email: "nope",
      password: "longenough",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("does not enforce password length so old accounts can still log in", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success
    ).toBe(true);
  });
});
