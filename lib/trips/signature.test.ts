import { describe, expect, it } from "vitest";
import { tripSignature } from "@/lib/trips/signature";

const base = {
  truckId: "10T_OB",
  routes: ["Delhi", "Jaipur"],
  tripType: "one-way",
  payloadTons: 10,
  capacityTons: 10,
};

describe("tripSignature", () => {
  it("ignores override key order, undefined values and missing fields", () => {
    const a = tripSignature({
      ...base,
      overrides: { mileage_kmpl: 4, terrain: "Plain", toll: undefined },
      excluded_heads: ["gps", "tyre"],
    });
    const b = tripSignature({
      ...base,
      overrides: { terrain: "Plain", mileage_kmpl: 4 },
      excluded_heads: ["tyre", "gps"],
    });
    expect(a).toBe(b);
    expect(tripSignature(base)).toBe(
      tripSignature({ ...base, overrides: {}, excluded_heads: [] })
    );
  });

  it("changes when the trip actually changes", () => {
    const original = tripSignature(base);
    expect(tripSignature({ ...base, payloadTons: 8 })).not.toBe(original);
    expect(tripSignature({ ...base, routes: ["Delhi", "Agra"] })).not.toBe(original);
    expect(tripSignature({ ...base, overrides: { mileage_kmpl: 5 } })).not.toBe(original);
    expect(tripSignature({ ...base, excluded_heads: ["gps"] })).not.toBe(original);
  });
});