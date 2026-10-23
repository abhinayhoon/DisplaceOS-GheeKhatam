"use client";

import { useState } from "react";

export const fieldClass = "w-full rounded-lg border border-white/10 bg-[#030712] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#F59E0B]";

export default function PasswordField({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} required minLength={8} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} pr-16`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
