"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode | null;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60";

export function AuthModal({ mode, onModeChange, onClose }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  const isSignup = mode === "signup";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = isSignup
      ? await signup(name, email, password)
      : await login(email, password);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-print="hide"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-sm rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="auth-modal-title"
              className="price-heading text-xl font-extrabold text-slate-900"
            >
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isSignup
                ? "Sign up to save trips and come back to them anytime."
                : "Log in to see your saved trips."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isSignup && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className={inputCls}
                autoFocus
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={inputCls}
              autoFocus={!isSignup}
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={inputCls}
            />
            {isSignup && (
              <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          {isSignup ? "Already have an account?" : "New to PriceMyTrip?"}{" "}
          <button
            type="button"
            onClick={() => onModeChange(isSignup ? "login" : "signup")}
            className="font-semibold text-blue-700 hover:underline"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
