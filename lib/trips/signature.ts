export interface TripSignatureSource {
  truckId: string;
  modelId?: string;
  routes: string[];
  tripType: string;
  payloadTons: number;
  capacityTons: number;
  overrides?: object;
  excluded_heads?: string[];
}

export function tripSignature(request: TripSignatureSource): string {
  const overrides = Object.entries(request.overrides ?? {})
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify({
    truckId: request.truckId,
    modelId: request.modelId ?? null,
    routes: request.routes,
    tripType: request.tripType,
    payloadTons: request.payloadTons,
    capacityTons: request.capacityTons,
    overrides,
    excludedHeads: [...(request.excluded_heads ?? [])].sort(),
  });
}