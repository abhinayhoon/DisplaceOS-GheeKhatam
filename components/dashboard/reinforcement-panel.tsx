"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { campTone, card, runwayHours } from "@/lib/types";

const UNITS = [
  ["HELI_AIRLIFT_SQUAD", "🚁 Heli Airlift Squad", "ETA −70% on a stalled convoy"],
  ["MOBILE_ICU_TRAUMA_TEAM", "🏥 Mobile ICU/Trauma Team", "+15 trauma beds · +100 kits"],
  ["ARMY_ENGINEER_CORPS", "🪖 Army Engineer Corps", "Clears LANDSLIDE_DETOUR"],
  ["MOBILE_WASH_POWER_RIG", "🔌 Mobile WASH/Power Rig", "Power & filtration → 100%"],
] as const;

export default function ReinforcementPanel() {
  const { data, can, deny, reinforce, busy } = useApp();
  const [sel, setSel] = useState<string>("");
  if (!data) return null;
  const crit = [...data.camps].sort((a, b) => runwayHours(a) - runwayHours(b));
  const campId = sel || (crit.find((c) => campTone(c) === "CRITICAL") ?? crit[0])?.id;
  const stalled = data.dispatches.filter((d) => d.routeStatus === "LANDSLIDE_DETOUR");
  const go = (kind: string, t: { campId?: string; dispatchId?: string }) => (can("REINFORCE") ? reinforce(kind, t) : deny("REINFORCE"));
  return (
    <section className={`${card} p-4`} aria-label="Emergency reinforcements">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white">🚨 Dispatch Emergency Reinforcements</h2>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">Target camp
          <select value={campId} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-white/10 bg-[#020408] px-2 py-1.5 text-xs text-white">
            {crit.map((c) => <option key={c.id} value={c.id}>{c.name} · {runwayHours(c).toFixed(1)}h {campTone(c) === "CRITICAL" ? "⚠" : ""}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {UNITS.filter(([k]) => k !== "HELI_AIRLIFT_SQUAD").map(([k, l, d]) => (
          <motion.button key={k} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={() => go(k, { campId })}
            className="rounded-xl border border-[#A855F7]/40 bg-[#A855F7]/10 p-3 text-left hover:bg-[#A855F7]/20 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A855F7]">
            <span className="block text-xs font-semibold text-white">{can("REINFORCE") ? "" : "🔒 "}{l}</span>
            <span className="block text-[10px] text-slate-400">{d}</span>
          </motion.button>
        ))}
      </div>
      <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Stalled convoys · {stalled.length}</h3>
      <ul className="space-y-2">
        {stalled.length === 0 && <li className="text-xs text-slate-600">No convoys on LANDSLIDE_DETOUR. Toggle one from the NDRF view to test.</li>}
        {stalled.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-xs">
            <span className="font-mono text-white">{d.unitCode}</span>
            <span className="text-slate-400">{d.originName} → {d.targetCampName} · ETA {d.etaMinutes} min</span>
            <span className="ml-auto flex gap-2">
              <button type="button" disabled={busy} onClick={() => go("HELI_AIRLIFT_SQUAD", { dispatchId: d.id })} className="rounded bg-[#A855F7] px-2 py-1 font-semibold text-white hover:bg-[#9333ea] disabled:opacity-40">🚁 Heli bypass</button>
              <button type="button" disabled={busy} onClick={() => go("ARMY_ENGINEER_CORPS", { dispatchId: d.id })} className="rounded border border-[#A855F7]/60 px-2 py-1 font-semibold text-[#A855F7] hover:bg-[#A855F7]/10 disabled:opacity-40">🪖 Clear route</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
