"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { ROLES } from "@/lib/types";

const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

export default function Navbar() {
  const { role, user, can, rebalance, flood, reset, busy, setPaletteOpen, openLogin, logout, offline, outbox, setMeshOpen, deny, live, setLive } = useApp();
  const lock = (p: Parameters<typeof can>[0], label: string) => (can(p) ? label : `🔒 ${label}`);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-2 text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
          Displace<span className="text-[#EF4444]">OS</span>
        </Link>
        {role && user && (
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => openLogin(null)} aria-label="Switch credentials"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
            <span className="font-mono font-semibold text-white">{user.badgeId}</span>
            <span className="text-slate-400">{ROLES[role].short}</span>
            <span className="text-[10px] text-[#38BDF8]">⇄ Switch</span>
          </motion.button>
        )}
        {role && <span className="hidden rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#10B981] lg:inline">{ROLES[role].badge}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setPaletteOpen(true)} className={`${btn} border border-white/10 font-normal text-slate-400 hover:text-white`}>⌘K</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" role="switch" aria-checked={live} onClick={() => setLive(!live)}
            className={`${btn} flex items-center gap-2 border ${live ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]" : "border-white/10 text-slate-400"}`}>
            <span className="relative flex size-2"><span className={`absolute inline-flex size-full rounded-full ${live ? "animate-ping bg-[#10B981] opacity-75" : ""}`} /><span className={`relative inline-flex size-2 rounded-full ${live ? "bg-[#10B981]" : "bg-slate-600"}`} /></span>
            {live ? "🟢 LIVE TELEMETRY STREAM (Real-Time Sync)" : "Live stream paused"}
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setMeshOpen(true)}
            className={`${btn} border ${offline ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-white/10 text-slate-300 hover:text-white"}`}>
            📡 {offline ? "OFFLINE FIELD MODE" : "Offline Mesh"}{outbox.length > 0 && <span className="ml-1.5 rounded-full bg-[#F59E0B] px-1.5 text-[10px] text-black">{outbox.length}</span>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={() => (can("REBALANCE") ? rebalance() : deny("REBALANCE"))} className={`${btn} bg-[#10B981] text-[#04120C] hover:bg-[#34d399]`}>
            🧠 {lock("REBALANCE", "1-Tap Auto-Rebalance Surplus")}
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={() => (can("SIMULATE") ? flood() : deny("SIMULATE"))} className={`${btn} bg-[#EF4444] text-white hover:bg-[#dc2626]`}>
            ⚡ {lock("SIMULATE", "Simulate Flash Flood SOS")}
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={reset} className={`${btn} border border-white/10 font-medium text-slate-300 hover:bg-white/10`}>↺ Reset Crisis Demo</motion.button>
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={logout} className={`${btn} border border-white/15 font-medium text-slate-200 hover:bg-white/10`}>Log out</motion.button>
        </div>
      </div>
    </header>
  );
}
