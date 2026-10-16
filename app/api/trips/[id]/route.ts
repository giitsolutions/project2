import { NextResponse } from "next/server";
import { deleteTrip } from "@/lib/db/repository";
import { getSessionUser } from "@/lib/auth/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const { id } = await params;
    if (!/^\d{1,10}$/.test(id)) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const deleted = await deleteTrip(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete trip failed", err);
    return NextResponse.json(
      { error: "Could not delete this trip" },
      { status: 500 }
    );
  }
}
