import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/db/repository";
import { setSessionCookie } from "@/lib/auth/session";
import { firstIssueMessage, loginSchema } from "@/lib/auth/validation";

let dummyHash: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("pricemytrip-timing-equalizer", 12);
  return dummyHash;
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  try {
    const doc = await findUserByEmail(email);

    const valid = await bcrypt.compare(
      password,
      doc?.passwordHash ?? (await getDummyHash())
    );
    if (!doc || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = { id: doc.id, email: doc.email, name: doc.name };
    await setSessionCookie(user);

    return NextResponse.json({ user });
  } catch (err) {
    console.error("login failed", err);
    return NextResponse.json(
      { error: "Could not log you in. Please try again." },
      { status: 500 }
    );
  }
}
