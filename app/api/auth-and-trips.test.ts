import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedTrip, SavedTripInput } from "@/lib/trips/schema";
import { DuplicateEmailError } from "@/lib/db/errors";

const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
}));

interface FakeUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

interface FakeTrip extends SavedTrip {
  userId: string;
}

const store = vi.hoisted(() => ({
  users: [] as FakeUser[],
  trips: [] as FakeTrip[],
  nextId: 1,
}));

vi.mock("@/lib/db/repository", async () => {
  const { DuplicateEmailError: Duplicate } = await import("@/lib/db/errors");

  return {
    findUserByEmail: async (email: string) =>
      store.users.find((u) => u.email === email) ?? null,
    createUser: async (input: {
      name: string;
      email: string;
      passwordHash: string;
    }) => {
      if (store.users.some((u) => u.email === input.email)) {
        throw new Duplicate();
      }
      const id = String(store.nextId++);
      store.users.push({ id, ...input });
      return id;
    },
    listTrips: async (userId: string, limit: number) =>
      store.trips
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(({ userId: _ignored, ...trip }) => trip),
    countTrips: async (userId: string) =>
      store.trips.filter((t) => t.userId === userId).length,
    insertTrip: async (userId: string, input: SavedTripInput) => {
      const trip: SavedTrip = {
        id: String(store.nextId++),
        ...input,
        createdAt: new Date().toISOString(),
      };
      store.trips.push({ ...trip, userId });
      return trip;
    },
    deleteTrip: async (userId: string, tripId: string) => {
      const index = store.trips.findIndex(
        (t) => t.id === tripId && t.userId === userId
      );
      if (index === -1) return false;
      store.trips.splice(index, 1);
      return true;
    },
  };
});

import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listTrips, POST as saveTrip } from "@/app/api/trips/route";
import { DELETE as deleteTrip } from "@/app/api/trips/[id]/route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteById(id: string) {
  return deleteTrip(new Request("http://localhost"), {
    params: Promise.resolve({ id }),
  });
}

const tripBody = {
  name: "Delhi to Mumbai",
  request: {
    truckId: "16T_6W",
    routes: ["Delhi", "Mumbai"],
    tripType: "one-way",
    payloadTons: 16,
    capacityTons: 16,
    overrides: { mileage_kmpl: 4.5, terrain: "Plain" },
    excluded_heads: ["gps"],
  },
  summary: {
    origin: "Delhi",
    destination: "Mumbai",
    distanceKm: 1400,
    totalCost: 98000,
  },
};

function signupAs(email: string) {
  return signup(jsonRequest({ name: "Asha", email, password: "password123" }));
}

describe("auth and saved trips", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "z".repeat(40);
    cookieJar.clear();
    store.users.length = 0;
    store.trips.length = 0;
    store.nextId = 1;
  });

  it("signs up, sets a session cookie and never stores the plain password", async () => {
    const res = await signupAs("Asha@Example.com");
    expect(res.status).toBe(201);
    expect(cookieJar.has("pmt_session")).toBe(true);
    expect(store.users[0].email).toBe("asha@example.com");
    expect(store.users[0].passwordHash).not.toContain("password123");

    const meRes = await me();
    expect((await meRes.json()).user.email).toBe("asha@example.com");
  });

  it("rejects duplicate emails", async () => {
    await signupAs("a@b.com");
    const res = await signupAs("A@B.com");
    expect(res.status).toBe(409);
    expect(new DuplicateEmailError().message).toMatch(/already exists/);
  });

  it("logs in with the right password and rejects the wrong one", async () => {
    await signupAs("a@b.com");
    cookieJar.clear();

    const bad = await login(jsonRequest({ email: "a@b.com", password: "wrongpass1" }));
    expect(bad.status).toBe(401);
    expect(cookieJar.has("pmt_session")).toBe(false);

    const unknown = await login(jsonRequest({ email: "x@y.com", password: "password123" }));
    expect(unknown.status).toBe(401);
    expect((await unknown.json()).error).toBe((await bad.json()).error);

    const ok = await login(jsonRequest({ email: "a@b.com", password: "password123" }));
    expect(ok.status).toBe(200);
    expect(cookieJar.has("pmt_session")).toBe(true);
  });

  it("logs out", async () => {
    await signupAs("a@b.com");
    await logout();
    expect((await (await me()).json()).user).toBeNull();
  });

  it("blocks trips endpoints when logged out", async () => {
    expect((await listTrips()).status).toBe(401);
    expect((await saveTrip(jsonRequest(tripBody))).status).toBe(401);
    expect((await deleteById("1")).status).toBe(401);
  });

  it("saves, lists and deletes a trip", async () => {
    await signupAs("a@b.com");

    const created = await saveTrip(jsonRequest(tripBody));
    expect(created.status).toBe(201);
    const { trip } = await created.json();

    const list = await (await listTrips()).json();
    expect(list.trips).toHaveLength(1);
    expect(list.trips[0].request.routes).toEqual(["Delhi", "Mumbai"]);
    expect(list.trips[0].request.overrides.mileage_kmpl).toBe(4.5);

    expect((await deleteById(trip.id)).status).toBe(200);
    expect((await (await listTrips()).json()).trips).toHaveLength(0);
  });

  it("keeps trips private to their owner", async () => {
    await signupAs("owner@b.com");
    const { trip } = await (await saveTrip(jsonRequest(tripBody))).json();

    cookieJar.clear();
    await signupAs("other@b.com");

    expect((await (await listTrips()).json()).trips).toHaveLength(0);
    expect((await deleteById(trip.id)).status).toBe(404);
    expect(store.trips).toHaveLength(1);
  });

  it("rejects malformed trips and malformed ids", async () => {
    await signupAs("a@b.com");

    const noRoutes = await saveTrip(
      jsonRequest({ ...tripBody, request: { ...tripBody.request, routes: ["Delhi"] } })
    );
    expect(noRoutes.status).toBe(400);

    const noName = await saveTrip(jsonRequest({ ...tripBody, name: "   " }));
    expect(noName.status).toBe(400);

    expect((await deleteById("not-an-id")).status).toBe(404);
  });
});
