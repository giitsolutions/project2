import { NextResponse } from "next/server";
import { countTrips, insertTrip, listTrips } from "@/lib/db/repository";
import { getSessionUser } from "@/lib/auth/session";
import { MAX_SAVED_TRIPS, savedTripInputSchema } from "@/lib/trips/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const trips = await listTrips(user.id, MAX_SAVED_TRIPS);
    return NextResponse.json({ trips });
  } catch (err) {
    console.error("list trips failed", err);
    return NextResponse.json(
      { error: "Could not load your saved trips" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const parsed = savedTripInputSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid trip data" },
        { status: 400 }
      );
    }

    const count = await countTrips(user.id);
    if (count >= MAX_SAVED_TRIPS) {
      return NextResponse.json(
        {
          error: `You can save up to ${MAX_SAVED_TRIPS} trips. Delete one to save another.`,
        },
        { status: 409 }
      );
    }

    const trip = await insertTrip(user.id, parsed.data);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    console.error("save trip failed", err);
    return NextResponse.json(
      { error: "Could not save this trip" },
      { status: 500 }
    );
  }
}
