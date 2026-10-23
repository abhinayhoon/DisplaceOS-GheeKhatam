"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/components/providers";
import { OPERATORS, ROLES, pill } from "@/lib/types";
import { useOverlay } from "@/lib/use-scroll-lock";

const input = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]";
const ICON = { GOV_AGENCY: "🏛️", RELIEF_CAMP: "⛺", RESCUE_TEAM: "🚁" } as const;
const NAME = { GOV_AGENCY: "NDMA Command", RELIEF_CAMP: "Relief Camp Manager", RESCUE_TEAM: "NDRF Field Unit" } as const;
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function OperatorModal() {
  const { loginOpen, closeLogin, login, user, requiredRole, sessionPending } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const gated = path.startsWith("/dashboard") && !user && !sessionPending;
  const open = loginOpen || gated;
  useOverlay(open, gated ? undefined : closeLogin);

  const go = async (identifier: string, credential?: string) => {
    setPending(true);
    const ok = await login(identifier, credential);
    setPending(false);
    if (ok) {
      setPassword("");
      if (!path.startsWith("/dashboard")) router.push("/dashboard");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }} transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020408]/70 p-4 backdrop-blur-2xl"
          onClick={() => !gated && closeLogin()}>
          <motion.div data-lenis-prevent role="dialog" aria-modal="true" aria-label="Operator sign in" initial={{ opacity: 0, y: 28, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }} onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative text-center">
              <span className={pill}>Operator Access</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{user ? "Sign in as another operator" : "Sign in to DisplaceOS"}</h2>
              <p className="mt-1 text-sm text-slate-400">Use your registered email and password.</p>
            </div>
            {requiredRole && <p className="relative mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">This action requires {ROLES[requiredRole].label}.</p>}
            {DEMO_ENABLED && (
              <ul className="relative mt-6 space-y-2">
                {OPERATORS.map((operator) => {
                  const active = user?.badgeId === operator.badgeId;
                  return <li key={operator.badgeId}>
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="button" disabled={pending} onClick={() => go(operator.badgeId)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-400/30 hover:bg-white/[0.07] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                      <span className="text-xl" aria-hidden>{ICON[operator.role]}</span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{NAME[operator.role]}{active && <span className="ml-2 font-mono text-[10px] tracking-widest text-emerald-400">ACTIVE</span>}</span>
                        <span className="block font-mono text-[11px] tracking-wider text-slate-500">Demo scenario</span></span>
                      <span className="text-slate-500" aria-hidden>›</span>
                    </motion.button>
                  </li>;
                })}
              </ul>
            )}
            <form className="relative mt-6 space-y-3 border-t border-white/10 pt-5" onSubmit={(event) => { event.preventDefault(); void go(email, password); }}>
              <input aria-label="Email" type="email" placeholder="Email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={input} />
              <input aria-label="Password" placeholder="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={input} />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={pending} className="flex-1 rounded-full bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{pending ? "Signing in…" : "Continue"}</motion.button>
                {!gated && <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={closeLogin} className="rounded-full border border-white/15 px-5 text-sm text-slate-300 hover:bg-white/10">Cancel</motion.button>}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
