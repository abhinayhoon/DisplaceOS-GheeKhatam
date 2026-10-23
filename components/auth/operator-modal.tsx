"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/components/providers";
import { OPERATORS, ROLES } from "@/lib/types";
import { useOverlay } from "@/lib/use-scroll-lock";

const input = "w-full rounded-lg border border-white/10 bg-[#030712] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#38BDF8]";

export default function OperatorModal() {
  const { loginOpen, closeLogin, login, user, requiredRole, sessionPending } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [badge, setBadge] = useState("");
  const [pass, setPass] = useState("");
  const [pending, setPending] = useState(false);

  // Dashboard without a session shows a non-dismissable gate.
  const gated = path.startsWith("/dashboard") && !user && !sessionPending;
  const open = loginOpen || gated;

  useOverlay(open, gated ? undefined : closeLogin);

  const go = async (b: string, p?: string) => {
    setPending(true);
    const ok = await login(b, p);
    setPending(false);
    if (ok) {
      setPass("");
      if (!path.startsWith("/dashboard")) router.push("/dashboard");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => !gated && closeLogin()}>
          <motion.div data-lenis-prevent role="dialog" aria-modal="true" aria-label="Tactical operator login" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B1220]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#38BDF8]">TACTICAL OPERATOR LOGIN</p>
            <h2 className="mt-1 text-xl font-bold text-white">{user ? "Switch Credentials" : "Authenticate to enter"}</h2>
            {requiredRole && <p className="mt-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#F59E0B]">🔒 That action requires {ROLES[requiredRole].label}.</p>}
            <ul className="mt-4 space-y-2">
              {OPERATORS.map((o) => {
                const active = user?.badgeId === o.badgeId, need = requiredRole === o.role;
                return (
                  <li key={o.badgeId}>
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="button" disabled={pending} onClick={() => go(o.badgeId)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8] ${need ? "border-[#F59E0B]/60 bg-[#F59E0B]/10" : active ? "border-[#10B981]/50 bg-[#10B981]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}>
                      <span className="text-xl" aria-hidden>{o.role === "GOV_AGENCY" ? "🏛️" : o.role === "RELIEF_CAMP" ? "⛺" : "🚁"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold text-white">{o.badgeId}{active && <span className="ml-2 text-[10px] text-[#10B981]">ACTIVE</span>}</span>
                        <span className="block text-xs text-slate-400">{ROLES[o.role].short} · {o.title}</span>
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">1-click</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
            <form className="mt-5 space-y-2 border-t border-white/10 pt-4" onSubmit={(e) => { e.preventDefault(); go(badge, pass); }}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Or enter credentials</p>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Badge ID" placeholder="Badge ID" autoComplete="username" required value={badge} onChange={(e) => setBadge(e.target.value.toUpperCase())} className={input} />
                <input aria-label="Passcode" placeholder="Passcode" type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} className={input} />
              </div>
              <p className="text-[10px] text-slate-500">Demo passcodes: NDMA-2026 · CAMP-2026 · NDRF-2026</p>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={pending} className="flex-1 rounded-lg bg-[#38BDF8] py-2 text-sm font-bold text-[#04121C] hover:bg-[#7dd3fc] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Authenticate</motion.button>
                {!gated && <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={closeLogin} className="rounded-lg border border-white/15 px-4 text-sm text-slate-300 hover:bg-white/10">Cancel</motion.button>}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
