"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import PasswordField, { fieldClass } from "./password-field";

const DEMO = [
  { label: "🏛️ Gov Agency", email: "gov@displaceos.demo" },
  { label: "⛺ Relief Camp", email: "camp@displaceos.demo" },
  { label: "🚁 Rescue Team", email: "rescue@displaceos.demo" },
];

function Form({ demo }: { demo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e: string, p: string) => {
    setLoading(true);
    setError("");
    const { error: err } = await authClient.signIn.email({ email: e, password: p });
    if (err) {
      setLoading(false);
      const msg = err.status === 429 ? "Too many attempts. Try again in a minute." : (err.message ?? "Invalid email or password");
      setError(msg);
      toast.error("Sign in failed", { description: msg });
      return;
    }
    toast.success("Signed in");
    router.push(dest);
    router.refresh();
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); login(email.trim(), password); }} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-slate-400">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="you@agency.gov" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-slate-400">Password</label>
          <PasswordField id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error && <p role="alert" className="text-sm text-[#EF4444]">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-bold text-[#1a1100] transition hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">No account? <Link href="/signup" className="text-[#F59E0B] hover:underline">Sign up</Link></p>
      {demo && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Demo accounts</p>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button key={d.email} type="button" disabled={loading} onClick={() => login(d.email, "Demo@12345")}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-[#F59E0B]/50 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
                {d.label} <span className="ml-1 text-slate-500">{d.email}</span>
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
