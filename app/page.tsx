"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { ROLES, card, type Role } from "@/lib/types";

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const STATS = [
  { v: "72h", l: "Window where most preventable deaths occur", c: "#EF4444" },
  { v: "38%", l: "Relief shipments duplicated across camps", c: "#F59E0B" },
  { v: "0", l: "Cross-district visibility in spreadsheet workflows", c: "#38BDF8" },
  { v: "<1s", l: "Surplus-to-shortage reroute in DisplaceOS", c: "#10B981" },
];

const ROLE_CARDS: { role: Role; icon: string; title: string; body: string; color: string; span: string }[] = [
  { role: "GOV_AGENCY", icon: "🏛️", title: "Government Agency", color: "#38BDF8", span: "md:col-span-2",
    body: "NDMA-level command view. Approve cross-district allocations, watch supply-vs-demand and runway charts, and trigger 1-click surplus rebalancing across depots." },
  { role: "RELIEF_CAMP", icon: "⛺", title: "Relief Camp", color: "#10B981", span: "",
    body: "File SOS requests, manage live stock, and register displaced families so no one is lost." },
  { role: "RESCUE_TEAM", icon: "🚁", title: "Rescue Team", color: "#F59E0B", span: "md:col-span-3",
    body: "Active dispatch missions with landslide-detour toggles and 1-click DELIVERED that instantly refills the target camp's inventory." },
];

export default function Home() {
  const { data, setRole } = useApp();
  const ticker = [
    ...(data?.requests.filter((r) => r.status === "PENDING").slice(0, 4).map((r) => `🔴 ${r.campName}: ${r.resourceType} shortfall ${r.quantityNeeded}`) ?? []),
    ...(data?.camps.filter((c) => c.status === "CRITICAL").map((c) => `⚠ ${c.name} (${c.district}) CRITICAL · ${c.currentOccupancy}/${c.capacity}`) ?? []),
    ...(data?.dispatches.filter((d) => d.routeStatus === "LANDSLIDE_DETOUR").map((d) => `🟠 ${d.unitCode} rerouted via landslide detour → ${d.targetCampName}`) ?? []),
  ];
  const items = ticker.length ? ticker : ["🔴 Live feed connecting…", "⚠ Uttarkashi · Chamoli · Rudraprayag · Tehri under watch"];

  return (
    <main className="relative flex-1 overflow-hidden">
            <div className="relative z-10 overflow-hidden border-b border-white/10 bg-[#0F1624]/80 py-2 text-xs">
        <motion.div
          className="flex w-max gap-12 whitespace-nowrap font-mono text-slate-300"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...items, ...items].map((t, i) => <span key={i}>{t}</span>)}
        </motion.div>
      </div>

      <motion.section variants={stagger} initial="hidden" animate="show" className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <motion.div variants={fade} className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-1 text-xs font-medium text-[#EF4444]">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#EF4444] opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-[#EF4444]" /></span>
          LIVE CRISIS COMMAND · UTTARAKHAND
        </motion.div>
        <motion.h1 variants={fade} className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.35)]">DisplaceOS: Unified Disaster Relief Coordination Platform</span>
        </motion.h1>
        <motion.p variants={fade} className="mx-auto mt-6 max-w-2xl text-pretty text-base text-slate-400 sm:text-lg">
          Eliminate duplicate deliveries, cross-district medicine blindspots, and spreadsheet delays in the critical first 72 hours.
        </motion.p>
        <motion.div variants={fade} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="rounded-xl bg-[#EF4444] active:scale-[0.98] hover:shadow-[0_0_40px_rgba(239,68,68,0.55)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(239,68,68,0.4)] transition hover:bg-[#dc2626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]">
            Enter Command Dashboard →
          </Link>
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm text-slate-300 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
            Press <kbd className="rounded bg-white/10 px-1.5 font-mono">⌘K</kbd> to search
          </motion.button>
        </motion.div>
      </motion.section>

      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4">
        {STATS.map((s) => (
          <motion.div key={s.l} variants={fade} whileHover={{ scale: 1.02, translateY: -2 }} className={`${card} p-5`}>
            <div className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: s.c }}>{s.v}</div>
            <p className="mt-2 text-xs text-slate-400">{s.l}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
        className="mx-auto mt-16 max-w-6xl px-4 pb-24 sm:px-6">
        <motion.h2 variants={fade} className="mb-6 text-2xl font-semibold text-white">Three stakeholders. One source of truth.</motion.h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ROLE_CARDS.map((r) => (
            <motion.div key={r.role} variants={fade} whileHover={{ scale: 1.02, translateY: -2 }} className={`${card} group relative p-6 ${r.span}`} style={{ borderColor: `${r.color}33` }}>
              <div className="text-3xl">{r.icon}</div>
              <h3 className="mt-3 text-lg font-semibold text-white">{r.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{r.body}</p>
              <p className="mt-4 font-mono text-[10px] tracking-widest" style={{ color: r.color }}>{ROLES[r.role].badge}</p>
              <Link href="/dashboard" onClick={() => setRole(r.role)} className="mt-4 inline-block text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
                Open as {r.title} →
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </main>
  );
}
