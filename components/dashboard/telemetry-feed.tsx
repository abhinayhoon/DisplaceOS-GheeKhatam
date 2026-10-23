"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";

const COLOR: Record<string, string> = {
  CONVOY: "#38BDF8", BURN_RATE: "#F59E0B", FACILITY: "#EF4444", WEATHER: "#A855F7", VERIFY: "#10B981",
  REINFORCE: "#A855F7", DELIVERY: "#10B981", REBALANCE: "#10B981", ROUTE: "#F59E0B", SYSTEM: "#64748b",
};

export default function TelemetryFeed() {
  const { data, live } = useApp();
  return (
    <section className={`${card} p-4`} aria-label="Real-time field telemetry feed">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        📡 Real-Time Field Telemetry Feed
        <span className={`ml-auto text-[10px] font-normal ${live ? "text-[#10B981]" : "text-slate-500"}`}>{live ? "● streaming" : "paused"}</span>
      </h2>
      <ul data-lenis-prevent className="h-56 space-y-1 overflow-y-auto font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {(data?.events ?? []).map((e) => (
            <motion.li key={e.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 truncate text-slate-400">
              <span className="text-slate-600">{new Date(e.createdAt).toLocaleTimeString()}</span>
              <span className="w-20 shrink-0" style={{ color: COLOR[e.kind] ?? "#94a3b8" }}>{e.kind}</span>
              <span className="truncate text-slate-300">{e.message}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
