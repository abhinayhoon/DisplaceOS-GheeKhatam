"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { ROLES, type Role } from "@/lib/types";

export default function Navbar() {
  const { role, setRole, can, rebalance, flood, busy, setPaletteOpen } = useApp();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-2 text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
          Displace<span className="text-[#EF4444]">OS</span>
        </Link>
        <div role="radiogroup" aria-label="Active RBAC role" className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#0F1624] p-1">
          {(Object.keys(ROLES) as Role[]).map((r) => (
            <motion.button whileTap={{ scale: 0.98 }} key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
              className="relative rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:text-white aria-checked:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
              {role === r && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-lg bg-[#38BDF8]/20 ring-1 ring-[#38BDF8]/50" />}
              <span className="relative">{ROLES[r].label}</span>
            </motion.button>
          ))}
        </div>
        <span className="rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#10B981]">{ROLES[role].badge}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setPaletteOpen(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
            ⌘K
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || !can("REBALANCE")} onClick={rebalance} title={can("REBALANCE") ? "" : "Gov Agency only"}
            className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-[#04120C] transition hover:bg-[#34d399] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {can("REBALANCE") ? "" : "🔒 "}🧠 1-Click Auto-Rebalance Surplus
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || !can("SIMULATE")} onClick={flood} title={can("SIMULATE") ? "" : "Gov Agency / Rescue Team only"}
            className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {can("SIMULATE") ? "" : "🔒 "}⚡ Simulate Flash Flood SOS
          </motion.button>
        </div>
      </div>
    </header>
  );
}
