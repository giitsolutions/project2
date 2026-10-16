"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import truckRatesJson from "@/config/truck-rates.json";

import { BreakdownChart } from "@/components/BreakdownChart";
import { CostBreakdownTable } from "@/components/CostBreakdownTable";
import { BatchUpload } from "@/components/BatchUpload";
import { BatchResultsTable } from "@/components/BatchResultsTable";
import {
  TripForm,
  type CalculateRequest,
} from "@/components/TripForm";
import { getSingleTripExcelFile } from "@/lib/export/excel";
import { getReportPdfFile } from "@/lib/export/pdf";
import { generateMethodologyMd } from "@/lib/export/methodology";
import {
  ReportEmailModal,
  type PendingReport,
} from "@/components/ReportEmailModal";
import { ProvenanceDrawer } from "@/components/ProvenanceDrawer";
import { ConfigurationTab } from "@/components/ConfigurationTab";
import type {
  ContributionCheck,
  RateOverrides,
  CostHeadId,
} from "@/lib/zbc/types";
import type { BreakdownRow } from "@/components/CostBreakdownTable";
import type { BatchRowResult } from "@/lib/export/excel";
import { RouteMap } from "@/components/RouteMap";
import { useAuth } from "@/components/AuthProvider";
import { AuthModal, type AuthMode } from "@/components/AuthModal";
import { AuthControls } from "@/components/AuthControls";
import { SaveTripControl } from "@/components/SaveTripControl";
import { SavedTripsPanel } from "@/components/SavedTripsPanel";
import type { SavedTrip, SavedTripInput } from "@/lib/trips/schema";
import { tripSignature } from "@/lib/trips/signature";

interface ProvenanceInfo {
  kind: string;
  label: string;
  detail?: string;
  updated_at?: string;
}

interface CalculateResponse {
  total: number;
  subtotal: number;
  ptpk: {
    payload: number;
    capacity: number;
  };
  breakdown: BreakdownRow[];
  contributions: ContributionCheck[];
  meta: {
    trip_days: number;
    distance_km: number;
    origin: {
      name: string;
      state: string;
      lat?: number;
      lng?: number;
      provenance?: ProvenanceInfo;
      name_provenance?: ProvenanceInfo;
    };
    destination: {
      name: string;
      state: string;
      lat?: number;
      lng?: number;
      provenance?: ProvenanceInfo;
      name_provenance?: ProvenanceInfo;
    };
    inputs?: {
      geocode_origin?: ProvenanceInfo;
      geocode_origin_name?: ProvenanceInfo;
      geocode_destination?: ProvenanceInfo;
      geocode_destination_name?: ProvenanceInfo;
      distance?: ProvenanceInfo;
      fuel?: ProvenanceInfo;
      toll?: ProvenanceInfo;
    };
    cost_heads?: Record<string, ProvenanceInfo>;
    toll: {
      plazas: number;
      highway?: string;
    };
    fuel: {
      price_inr: number;
      state: string;
    };
    truck?: {
      truck_id: string;
      truck_label: string;
      model_id?: string;
      model_label?: string;
      mileage_used: number;
      provenance: ProvenanceInfo;
    };
  };
  error?: string;
  suggestions?: string[];
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [showContribution, setShowContribution] = useState(true);
  const [showChart, setShowChart] = useState(true);

  const [lastRequest, setLastRequest] = useState<CalculateRequest | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(null);
  const [tab, setTab] = useState<"single" | "batch">("single");
  const [batchResults, setBatchResults] = useState<BatchRowResult[]>([]);
  const [formMinimized, setFormMinimized] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<"configuration" | "breakdown" | "route" | "saved">("breakdown");
  const [configOverrides, setConfigOverrides] = useState<RateOverrides>({});
  const [excludedHeads, setExcludedHeads] = useState<CostHeadId[]>([]);
  const [provenanceResult, setProvenanceResult] = useState<CalculateResponse | null>(null);

  const skipNextRecomputeRef = useRef(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const truckRates = truckRatesJson.trucks;

  const { user, ready: authReady } = useAuth();
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const showSaved = user !== null && activeResultTab === "saved";

  const resultTabs: ("configuration" | "breakdown" | "route" | "saved")[] = [
    "configuration",
    "breakdown",
    "route",
    ...(user ? (["saved"] as const) : []),
  ];

  const currentTripRequest = lastRequest
    ? {
        ...lastRequest,
        overrides: { ...lastRequest.overrides, ...configOverrides },
        excluded_heads: excludedHeads,
      }
    : null;

  const isCurrentTripSaved =
    currentTripRequest !== null &&
    savedSignature !== null &&
    savedSignature === tripSignature(currentTripRequest);

  useEffect(() => {
    if (authReady && !user && activeResultTab === "saved") {
      setActiveResultTab("breakdown");
    }
  }, [authReady, user, activeResultTab]);

  async function handleCalculate(
    req: CalculateRequest,
    opts?: { silent?: boolean; restore?: boolean }
  ): Promise<boolean> {
    if (!opts?.silent) {
      setLoading(true);
      setResult(null);
      if (!opts?.restore) setSavedSignature(null);
      setConfigOverrides(opts?.restore ? (req.overrides ?? {}) : {});
      setExcludedHeads(opts?.restore ? (req.excluded_heads ?? []) : []);
      skipNextRecomputeRef.current = true;
    }

    setError(null);
    setSuggestions([]);
    setLastRequest(req);

    try {
      const res = await fetch("/api/newcalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const data = (await res.json()) as CalculateResponse & {
        error?: string;
        suggestions?: string[];
      };

      if (!res.ok) {
        setError(data.error ?? "Calculation failed");
        if (data.suggestions?.length) setSuggestions(data.suggestions);
        return false;
      }

      setResult(data);
      if (!opts?.silent) setFormMinimized(true);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!lastRequest) return;
    if (skipNextRecomputeRef.current) {
      skipNextRecomputeRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const merged: CalculateRequest = {
        ...lastRequest,
        overrides: { ...lastRequest.overrides, ...configOverrides },
        excluded_heads: excludedHeads,
      };
      handleCalculate(merged, { silent: true });
    }, 400);

    return () => clearTimeout(handle);
  }, [configOverrides, excludedHeads]);

  function buildExportResult() {
    if (!result) return null;
    return {
      ...result,
      meta: {
        ...result.meta,
        origin: { name: result.meta.origin.name },
        destination: { name: result.meta.destination.name },
      },
    };
  }

  function buildTripDetails(): PendingReport["tripDetails"] {
    return {
      truckId: lastRequest?.truckId,
      modelId: lastRequest?.modelId,
      tripType: lastRequest?.tripType,
      payloadTons: lastRequest?.payloadTons,
      capacityTons: lastRequest?.capacityTons,
      routes: lastRequest?.routes ?? [],
      origin: result?.meta.origin.name,
      destination: result?.meta.destination.name,
      distanceKm: result?.meta.distance_km,
      tripDays: result?.meta.trip_days,
      totalCost: result?.total,
      subtotal: result?.subtotal,
      ptpkPayload: result?.ptpk.payload,
      ptpkCapacity: result?.ptpk.capacity,
      dieselPrice: result?.meta.fuel.price_inr,
      dieselState: result?.meta.fuel.state,
      tollPlazas: result?.meta.toll.plazas,
    };
  }

  function handleDownloadExcel() {
    const exportResult = buildExportResult();
    if (!exportResult) return;
    const file = getSingleTripExcelFile(exportResult, {
      truckId: lastRequest?.truckId ?? "",
    });
    setPendingReport({ file, type: "excel", tripDetails: buildTripDetails() });
    setEmailModalOpen(true);
  }

  async function handleDownloadPdf() {
    const node = reportRef.current;
    if (!node) return;
    try {
      const file = await getReportPdfFile(node);
      setPendingReport({ file, type: "pdf", tripDetails: buildTripDetails() });
      setEmailModalOpen(true);
    } catch (err) {
      setError("Unable to generate the PDF report. Please try again.");
    }
  }

  async function handleSaveTrip(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!result || !currentTripRequest) return { ok: false, error: "Calculate a trip first" };
    const body: SavedTripInput = {
      name,
      request: currentTripRequest as SavedTripInput["request"],
      summary: {
        origin: result.meta.origin.name,
        destination: result.meta.destination.name,
        distanceKm: result.meta.distance_km,
        totalCost: result.total,
        tripDays: result.meta.trip_days,
        truckLabel: result.meta.truck?.truck_label,
        modelLabel: result.meta.truck?.model_label,
        ptpkPayload: result.ptpk.payload,
      },
    };

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: res.status === 401 ? "Your session expired. Please log in again." : (data.error ?? "Could not save this trip") };
      }
      setSavedSignature(tripSignature(currentTripRequest));
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async function handleOpenSavedTrip(trip: SavedTrip) {
    setTab("single");
    setActiveResultTab("breakdown");
    const ok = await handleCalculate(trip.request as CalculateRequest, { restore: true });
    if (ok) setSavedSignature(tripSignature(trip.request));
  }

  function openSavedTrips() {
    setTab("single");
    setActiveResultTab("saved");
  }

  const kpis = result
    ? [
        { label: "Distance", value: `${result.meta.distance_km} km`, card: "border-l-blue-500 bg-blue-50", text: "text-blue-700" },
        { label: "Diesel", value: `₹${result.meta.fuel.price_inr}/L`, card: "border-l-amber-500 bg-amber-50", text: "text-amber-700" },
        { label: "Price Per Ton Per Kilometer (Payload)", value: `₹${result.ptpk.payload.toFixed(2)}`, card: "border-l-emerald-500 bg-emerald-50", text: "text-emerald-700" },
        { label: "Price Per Ton Per Kilometer (Capacity)", value: `₹${result.ptpk.capacity.toFixed(2)}`, card: "border-l-violet-500 bg-violet-50", text: "text-violet-700" },
      ]
    : [];

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap");

        body {
          font-family: "Inter", sans-serif;
          -webkit-font-smoothing: antialiased;
          background: linear-gradient(180deg, #e8eef9 0%, #f1f5f9 40%, #e9eef5 100%);
          background-attachment: fixed;
        }

        .price-heading {
          font-family: "Plus Jakarta Sans", sans-serif;
        }

        .standard-card {
          background: #ffffff;
          border: 1px solid #dbe3ee;
          box-shadow: 0 10px 30px -12px rgba(15, 23, 42, 0.18);
        }

        .auth-zone > div,
        .auth-zone > button,
        .auth-zone button {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 9999px;
          padding: 8px 16px;
          backdrop-filter: blur(6px);
          box-shadow: none;
          transition: all 0.2s ease;
        }

        .auth-zone button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .auth-zone button:last-of-type {
          background: #ffffff;
          color: #1e3a8a;
          border-color: #ffffff;
        }

        .auth-zone button:last-of-type:hover {
          background: #dbeafe;
        }

        .saved-zone button {
          transition: all 0.2s ease;
        }

        .saved-zone > div > :has(button),
        .saved-zone article {
          border: 1px solid #e2e8f0;
          border-left: 4px solid #2563eb;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 6px 18px -10px rgba(15, 23, 42, 0.25);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .saved-zone > div > :has(button):hover,
        .saved-zone article:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 30px -14px rgba(37, 99, 235, 0.4);
        }

        .saved-zone button:last-of-type:not(:first-of-type) {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 6px 16px;
          font-weight: 700;
        }

        .saved-zone button:last-of-type:not(:first-of-type):hover {
          background: #dc2626;
          border-color: #dc2626;
          color: #ffffff;
        }

        .clean-input-wrapper input,
        .clean-input-wrapper select {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 10px !important;
          transition: all 0.2s ease;
        }

        .clean-input-wrapper input:focus,
        .clean-input-wrapper select:focus {
          background: #ffffff !important;
          border-color: #2563eb !important;
          outline: none !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12) !important;
        }

        .clean-input-wrapper button[type="submit"] {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          box-shadow: 0 10px 20px -8px rgba(37, 99, 235, 0.6);
          transition: all 0.2s ease;
        }

        .clean-input-wrapper button[type="submit"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 24px -8px rgba(37, 99, 235, 0.7);
        }

        input::placeholder {
          color: #94a3b8;
        }
      `}</style>

      <main className="flex min-h-screen flex-col text-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900" data-print="hide">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <header className="relative mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8 lg:px-12">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white px-2 py-1 shadow-lg ring-4 ring-white/10">
                <Image
                  src="/images/logo.png"
                  alt="ACG Logo"
                  width={100}
                  height={60}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="price-heading text-2xl font-extrabold tracking-tight text-white md:text-[30px]">
                  PriceMyTrip
                </h1>
                <p className="mt-0.5 text-[13px] font-medium text-blue-200 md:text-[14px]">
                  Zero-Based Freight Trip Cost Calculator
                </p>
              </div>
            </div>
            <div className="auth-zone flex items-center gap-3 text-white">
              <AuthControls onOpenAuth={setAuthModal} onOpenSaved={openSavedTrips} />
            </div>
          </header>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1440px] flex-1 px-5 py-8 md:px-8 lg:px-12">
          <div className={`grid items-start gap-10 ${formMinimized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12"}`}>
            {formMinimized && (
              <button
                onClick={() => setFormMinimized(false)}
                className="flex w-fit items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
                data-print="hide"
              >
                ▸ Show input form
              </button>
            )}

            <section
              className={`relative rounded-3xl border border-slate-200 border-t-[5px] border-t-blue-600 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7 lg:col-span-4 ${formMinimized ? "hidden" : ""}`}
              data-print="hide"
            >
              <div className="mb-6 flex rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
                {(["single", "batch"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      tab === t
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t === "single" ? "Single Trip" : "Batch Upload"}
                  </button>
                ))}
              </div>

              {tab === "single" && (
                <div className="clean-input-wrapper">
                  <TripForm onSubmit={handleCalculate} loading={loading} truckRates={truckRates} />
                </div>
              )}

              {tab === "batch" && (
                <div className="clean-input-wrapper">
                  <BatchUpload onResults={(rows) => setBatchResults(rows)} />
                </div>
              )}
            </section>

            <section className={formMinimized ? "min-w-0" : "min-w-0 lg:col-span-8 pl-4"}>
              {tab === "single" && loading && (
                <div className="flex min-h-[520px] flex-col items-center justify-center">
                  <div className="mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  <p className="text-sm font-semibold text-slate-600">Fetching route, tolls, and fuel price…</p>
                </div>
              )}

              {tab === "single" && error && !loading && !result && !showSaved && (
                <div role="alert" className="standard-card rounded-xl border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  <p>{error}</p>
                  {suggestions.length > 0 && (
                    <p className="mt-1 font-medium">Did you mean: {suggestions.join(", ")}?</p>
                  )}
                </div>
              )}

              {tab === "single" && !result && !loading && !error && !showSaved && (
                <div className="flex flex-col pt-4">
                  <div className="mb-6 self-start inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    Scientific Freight Pricing Standard
                  </div>

                  <h2 className="price-heading text-[42px] leading-tight font-extrabold text-slate-900 tracking-tight max-w-3xl">
                    Predictable Freight Pricing, Grounded in Real Costs
                  </h2>

                  <p className="mt-4 text-[17px] text-slate-600 max-w-2xl">
                    Accurately estimate end-to-end commercial haulage expenses with real-time fuel prices, live route distances.
                  </p>

                  <div className="mt-8 w-full max-w-[850px] overflow-hidden rounded-2xl shadow-sm border border-slate-200 bg-white">
                    <Image
                      src="/images/image.png"
                      alt="Commercial truck on highway"
                      width={1200}
                      height={800}
                      className="w-full h-auto object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {tab === "batch" && batchResults.length > 0 && (
                <div className="standard-card rounded-2xl p-5 sm:p-7">
                  <BatchResultsTable
                    results={batchResults}
                    onShowProvenance={(r) => setProvenanceResult(r as unknown as CalculateResponse)}
                  />
                </div>
              )}

              {tab === "single" && showSaved && !result && !loading && (
                <div className="space-y-4" data-print="hide">
                  <button
                    onClick={() => setActiveResultTab("breakdown")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                  >
                    ← Back
                  </button>
                  <div className="standard-card saved-zone rounded-3xl p-5 sm:p-7">
                    <SavedTripsPanel onOpen={handleOpenSavedTrip} />
                  </div>
                </div>
              )}

              {tab === "single" && result && !loading && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-slate-200" data-print="hide">
                    {resultTabs.map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveResultTab(t)}
                        className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                          activeResultTab === t
                            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        {t === "route" ? "Route Map" : t === "configuration" ? "Configuration" : t === "saved" ? "Saved Trips" : "Cost Breakdown"}
                      </button>
                    ))}
                  </div>

                  {showSaved && (
                    <div className="standard-card saved-zone rounded-3xl p-5 sm:p-7" data-print="hide">
                      <SavedTripsPanel onOpen={handleOpenSavedTrip} />
                    </div>
                  )}

                  <div className={`rounded-3xl bg-gradient-to-b from-slate-100 to-slate-200/70 p-4 ring-1 ring-slate-200 sm:p-5 ${showSaved ? "hidden" : ""}`} ref={reportRef}>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 text-white shadow-xl shadow-blue-900/25">
                      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
                      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Total Estimated Cost</span>
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                            <span className="price-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
                              {formatInr(result.total)}
                            </span>
                            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-300/40">
                              all inclusive
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-left ring-1 ring-white/20 backdrop-blur sm:text-right">
                          <span className="block text-xs font-semibold text-blue-200">Computed Route</span>
                          <span className="text-sm font-bold">
                            {result.meta.origin.name} → {result.meta.destination.name} ({result.meta.distance_km} km)
                          </span>
                        </div>
                      </div>
                    </div>

                    {activeResultTab === "breakdown" && (
                      <div className="mt-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          {kpis.map((k) => (
                            <div
                              key={k.label}
                              className={`rounded-2xl border border-slate-200 border-l-4 p-4 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg ${k.card}`}
                            >
                              <p className={`text-[11px] font-bold uppercase tracking-wide ${k.text}`}>{k.label}</p>
                              <p className="mt-1.5 text-xl font-extrabold text-slate-900">{k.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2" data-print="hide">
                          <button
                            onClick={handleDownloadExcel}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
                          >
                            Download Excel
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition-all hover:-translate-y-0.5 hover:bg-rose-700"
                          >
                            Download PDF
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-5">
                          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700" data-print="hide">
                            <input type="checkbox" checked={showContribution} onChange={(e) => setShowContribution(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Show benchmark check
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700" data-print="hide">
                            <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Show cost breakdown chart
                          </label>
                        </div>

                        {showChart && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
                            <BreakdownChart data={result.breakdown.map((r) => ({ name: r.name.replace(/ \(.+\)/, ""), amount: r.amount_inr }))} />
                          </div>
                        )}

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
                          <CostBreakdownTable rows={result.breakdown} contributions={result.contributions} showContribution={showContribution} />
                        </div>
                      </div>
                    )}

                    {activeResultTab === "configuration" && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
                        <ConfigurationTab
                          truckId={result.meta.truck?.truck_id ?? ""}
                          modelId={result.meta.truck?.model_id}
                          overrides={configOverrides}
                          excludedHeads={excludedHeads}
                          onChange={(nextOverrides, nextExcluded) => {
                            setConfigOverrides(nextOverrides);
                            setExcludedHeads(nextExcluded);
                          }}
                        />
                      </div>
                    )}

                    {activeResultTab === "route" && (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                        <RouteMap origin={result.meta.origin} destination={result.meta.destination} />
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-300 pt-5" data-print="hide">
                      <button
                        onClick={() => {
                          setResult(null);
                          setFormMinimized(false);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                      >
                        ← Clear breakdown
                      </button>
                      {!user && authReady && (
                        <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                          <span className="text-xs font-semibold text-slate-700">Log in or sign up to save this trip</span>
                          <button
                            onClick={() => setAuthModal("login")}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
                          >
                            Log in
                          </button>
                          <button
                            onClick={() => setAuthModal("signup")}
                            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
                          >
                            Sign up
                          </button>
                        </div>
                      )}
                      {user &&
                        (isCurrentTripSaved ? (
                          <span className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm">
                            ✓ Saved to your trips
                          </span>
                        ) : (
                          <SaveTripControl
                            defaultName={`${result.meta.origin.name} → ${result.meta.destination.name}`}
                            onSave={handleSaveTrip}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <ProvenanceDrawer open={provenanceResult !== null} onClose={() => setProvenanceResult(null)} result={provenanceResult} />
        <AuthModal mode={authModal} onModeChange={setAuthModal} onClose={() => setAuthModal(null)} />
        <ReportEmailModal open={emailModalOpen} report={pendingReport} onClose={() => setEmailModalOpen(false)} />

        <footer className="mt-auto bg-slate-950 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-slate-300">© {new Date().getFullYear()} PriceMyTrip</p>
            <p className="text-xs text-slate-500">
              All rights reserved
              <span className="mx-2 text-slate-700">•</span>
              Technical Partner:
              <span className="ml-1 font-semibold text-blue-300">Kodax Technologies</span>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
