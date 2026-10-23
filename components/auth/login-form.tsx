"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers";
import PasswordField, { fieldClass } from "./password-field";

const DEMO = [
  { label: "🏛️ NDMA Command", badgeId: "NDMA-CMD-01" },
  { label: "⛺ Relief Camp Manager", badgeId: "CAMP-ALPHA-04" },
  { label: "🚁 NDRF Field Unit", badgeId: "NDRF-UNIT-09" },
];

function Form({ demo }: { demo: boolean }) {
  const router = useRouter();
  const { login: signIn } = useApp();
  const params = useSearchParams();
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (credentials: { email: string; password: string } | { demoBadgeId: string }) => {
    setLoading(true);
    const ok = "demoBadgeId" in credentials
      ? await signIn(credentials.demoBadgeId)
      : await signIn(credentials.email, credentials.password);
    if (!ok) {
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push(dest);
    router.refresh();
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); void login({ email: email.trim(), password }); }} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-slate-400">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="you@agency.gov" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-slate-400">Password</label>
          <PasswordField id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">No account? <Link href="/signup" className="text-[#F59E0B] hover:underline">Sign up</Link></p>
      {demo && process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Demo accounts</p>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button key={d.badgeId} type="button" disabled={loading} onClick={() => void login({ demoBadgeId: d.badgeId })}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-[#F59E0B]/50 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginForm({ demo }: { demo: boolean }) {
  return <Suspense fallback={null}><Form demo={demo} /></Suspense>;
}
