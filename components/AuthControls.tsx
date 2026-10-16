"use client";

import { useAuth } from "@/components/AuthProvider";
import type { AuthMode } from "@/components/AuthModal";

interface AuthControlsProps {
  onOpenAuth: (mode: AuthMode) => void;
  onOpenSaved: () => void;
}

const ghostBtn =
  "rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-[13px] font-semibold text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md";

export function AuthControls({ onOpenAuth, onOpenSaved }: AuthControlsProps) {
  const { user, ready, logout } = useAuth();

  if (!ready) {
    return <div className="h-9 w-48" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 self-start sm:self-center">
        <button type="button" onClick={() => onOpenAuth("login")} className={ghostBtn}>
          Log in
        </button>
        <button
          type="button"
          onClick={() => onOpenAuth("signup")}
          className="rounded-xl bg-blue-700 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-blue-800 hover:shadow-md"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
      <button type="button" onClick={onOpenSaved} className={ghostBtn}>
        Saved Trips
      </button>

      <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 py-1.5 pl-1.5 pr-3 shadow-sm backdrop-blur-md">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold uppercase text-white"
          aria-hidden="true"
        >
          {user.name.charAt(0)}
        </span>
        <span className="max-w-[140px] truncate text-[13px] font-semibold text-slate-800">
          {user.name}
        </span>
      </div>

      <button type="button" onClick={() => void logout()} className={ghostBtn}>
        Log out
      </button>
    </div>
  );
}
