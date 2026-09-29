"use client";

import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PendingReport {
  file: File;
  type: "pdf" | "excel";

  tripDetails: {
    customerEmail?: string;

    truckId?: string;
    modelId?: string;
    tripType?: string;

    payloadTons?: number;
    capacityTons?: number;

    routes?: string[];

    origin?: string;
    destination?: string;

    distanceKm?: number;
    tripDays?: number;

    totalCost?: number;
    subtotal?: number;

    ptpkPayload?: number;
    ptpkCapacity?: number;

    dieselPrice?: number;
    dieselState?: string;

    tollPlazas?: number;
  };
}

interface ReportEmailModalProps {
  open: boolean;
  report: PendingReport | null;
  onClose: () => void;
}

type SendStatus = "idle" | "sending" | "sent" | "error";

export function ReportEmailModal({
  open,
  report,
  onClose,
}: ReportEmailModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!open || !report) return null;

  function resetAndClose() {
    setEmail("");
    setStatus("idle");
    setError(null);
    onClose();
  }

  async function handleSend() {
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setStatus("sending");

    try {
      const formData = new FormData();
      const d = report!.tripDetails;

      formData.append("email", trimmed);
      formData.append("report", report!.file);
      formData.append("reportType", report!.type);

      formData.append("customerEmail", trimmed);
      formData.append("truckId", d.truckId ?? "");
      formData.append("modelId", d.modelId ?? "");
      formData.append("tripType", d.tripType ?? "");
      formData.append("payloadTons", d.payloadTons?.toString() ?? "");
      formData.append("capacityTons", d.capacityTons?.toString() ?? "");
      formData.append("routes", JSON.stringify(d.routes ?? []));
      formData.append("origin", d.origin ?? "");
      formData.append("destination", d.destination ?? "");
      formData.append("distanceKm", d.distanceKm?.toString() ?? "");
      formData.append("tripDays", d.tripDays?.toString() ?? "");

      // route.ts reads "total" (not "totalCost") for the email body
      formData.append(
        "total",
        d.totalCost !== undefined
          ? Math.round(d.totalCost).toLocaleString("en-IN")
          : ""
      );
      formData.append("subtotal", d.subtotal?.toString() ?? "");
      formData.append("ptpkPayload", d.ptpkPayload?.toFixed(2) ?? "");
      formData.append("ptpkCapacity", d.ptpkCapacity?.toFixed(2) ?? "");
      formData.append("dieselPrice", d.dieselPrice?.toString() ?? "");
      formData.append("dieselState", d.dieselState ?? "");
      formData.append("tollPlazas", d.tollPlazas?.toString() ?? "");

      // Do not set Content-Type manually — the browser adds the multipart boundary.
      const res = await fetch("/api/send-report", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(
          data?.error || "Failed to send the report. Please try again."
        );
        setStatus("error");
        return;
      }

      console.log("PriceMyTrip report email sent successfully:", data);
      setStatus("sent");
    } catch (err) {
      console.error("PriceMyTrip report email error:", err);
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {status === "sent" ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-600">
              ✓
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Report sent successfully
            </h3>

            <p className="text-sm text-slate-600">
              The report has been sent to <strong>{email.trim()}</strong>.
            </p>

            <button
              type="button"
              onClick={resetAndClose}
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Send report to email
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Enter your email address to receive the generated report.
              </p>
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="user@example.com"
                disabled={status === "sending"}
                autoFocus
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
              />

              {error && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={status === "sending"}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={status === "sending"}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send Report"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}