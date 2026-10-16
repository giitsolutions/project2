"use client";

import { useEffect, useState, type FormEvent } from "react";

interface SaveTripControlProps {
  defaultName: string;
  onSave: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function SaveTripControl({ defaultName, onSave }: SaveTripControlProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setName(defaultName);
  }, [defaultName, editing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await onSave(name);

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-xl border border-blue-800 bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-800"
      >
        Save trip
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        disabled={saving}
        aria-label="Trip name"
        placeholder="Trip name"
        className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        autoFocus
      />
      <button
        type="submit"
        disabled={saving || name.trim().length === 0}
        className="rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setError(null);
        }}
        disabled={saving}
        className="rounded-xl border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
      >
        Cancel
      </button>
      {error && (
        <span role="alert" className="w-full text-xs font-semibold text-red-700">
          {error}
        </span>
      )}
    </form>
  );
}
