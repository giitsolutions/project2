"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedTrip } from "@/lib/trips/schema";
import { formatDate, formatInr } from "@/lib/utils/format";

interface SavedTripsPanelProps {
  onOpen: (trip: SavedTrip) => void;
}

export function SavedTripsPanel({ onOpen }: SavedTripsPanelProps) {
  const [trips, setTrips] = useState<SavedTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTrips(null);

    try {
      const res = await fetch("/api/trips");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not load your saved trips");
        return;
      }
      setTrips(data.trips as SavedTrip[]);
    } catch {
      setError("Network error. Please try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);

    try {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete this trip");
        return;
      }

      setTrips((prev) => prev?.filter((t) => t.id !== id) ?? null);
      setConfirmingId(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="price-heading text-lg font-extrabold text-slate-900">
          Saved Trips
        </h2>
        {trips && trips.length > 0 && (
          <span className="text-xs font-semibold text-slate-600">
            {trips.length} saved
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {trips === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="glass-card h-40 animate-pulse rounded-xl"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="price-heading text-base font-bold text-slate-800">
            No saved trips yet
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Calculate a trip, then use “Save trip” to keep it here.
          </p>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => {
            const { summary } = trip;
            const confirming = confirmingId === trip.id;
            const deleting = deletingId === trip.id;

            return (
              <article
                key={trip.id}
                className="glass-card flex flex-col rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900">
                    {trip.name}
                  </h3>
                  <span className="whitespace-nowrap text-[11px] font-semibold text-slate-600">
                    {formatDate(trip.createdAt)}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {summary.origin} → {summary.destination}
                </p>

                <p className="price-heading mt-3 text-2xl font-extrabold text-slate-950">
                  {formatInr(summary.totalCost)}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
                  <dt className="font-semibold text-slate-600">Distance</dt>
                  <dd className="text-right font-bold">{summary.distanceKm} km</dd>

                  <dt className="font-semibold text-slate-600">Truck</dt>
                  <dd className="truncate text-right font-bold">
                    {summary.modelLabel ?? summary.truckLabel ?? trip.request.truckId}
                  </dd>

                  <dt className="font-semibold text-slate-600">Payload</dt>
                  <dd className="text-right font-bold">
                    {trip.request.payloadTons} / {trip.request.capacityTons} t
                  </dd>

                  <dt className="font-semibold text-slate-600">Trip type</dt>
                  <dd className="text-right font-bold capitalize">
                    {trip.request.tripType}
                  </dd>
                </dl>

                <div className="mt-4 flex items-center gap-2 border-t border-white/40 pt-3">
                  {confirming ? (
                    <>
                      <span className="text-xs font-semibold text-slate-700">
                        Delete this trip?
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(trip.id)}
                        disabled={deleting}
                        className="ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={deleting}
                        className="rounded-lg border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(trip)}
                        className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(trip.id)}
                        className="ml-auto rounded-lg border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-white"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
