import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/db/repository";
import { DuplicateEmailError } from "@/lib/db/errors";
import { setSessionCookie } from "@/lib/auth/session";
import { firstIssueMessage, signupSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const id = await createUser({ name, email, passwordHash });

    const user = { id, email, name };
    await setSessionCookie(user);

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("signup failed", err);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
