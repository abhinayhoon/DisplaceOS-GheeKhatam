"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { card, runwayHours } from "@/lib/types";
import RequestsPanel from "./requests-panel";

const TYPES = ["FOOD", "WATER", "MEDICINE", "SHELTER", "EVACUATION"];
const FIELDS = [
  ["foodPackets", "Food packets", 100], ["waterLiters", "Water (L)", 500], ["medicalKits", "Medical kits", 10], ["shelterTents", "Shelter tents", 10],
] as const;
const input = "w-full rounded-lg border border-white/10 bg-[#030712] px-3 py-2 text-sm text-white outline-none focus:border-[#38BDF8]";

export default function CampView() {
  const { data, user, createRequest, registerSurvivor, adjustStock, busy, offline } = useApp();
  const [type, setType] = useState("FOOD");
  const [qty, setQty] = useState("500");
  const [p, setP] = useState({ fullName: "", age: "30", medicalNeeds: "", familyGroupCode: "" });
  if (!data) return null;
  const camp = data.camps.find((c) => c.name === user?.campName) ?? data.camps[0];
  if (!camp) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Managing <b className="text-white">{camp.name}</b> · {camp.district}{offline && <span className="ml-2 rounded bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] text-[#F59E0B]">OFFLINE FIELD MODE · writes queue as mesh packets</span>}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <form className={`${card} space-y-3 p-4`} onSubmit={async (e) => { e.preventDefault(); const ok = await createRequest({ resourceType: type, quantityNeeded: Math.max(1, Number(qty) || 1) }); if (ok) { setType("FOOD"); setQty("500"); } }}>
          <h2 className="text-sm font-semibold text-white">🆘 Submit SOS Resource Request</h2>
          <label className="block text-xs text-slate-400">Resource
            <select value={type} onChange={(e) => setType(e.target.value)} className={`${input} mt-1`}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label className="block text-xs text-slate-400">Quantity needed
            <input type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} className={`${input} mt-1`} />
          </label>
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={busy} className="w-full rounded-lg bg-[#EF4444] py-2 text-sm font-bold text-white hover:bg-[#dc2626] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Send SOS</motion.button>
        </form>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-white">Live stock · {camp.name}</h2>
          <p className="-mt-2 mb-3 text-xs text-slate-400">Food runway {runwayHours(camp).toFixed(1)}h · burn {camp.burnRatePerHour}/h</p>
          <ul className="space-y-2">
            {FIELDS.map(([f, l, step]) => (
              <li key={f} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{l}</span>
                <span className="flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.98 }} type="button" aria-label={`Decrease ${l}`} disabled={busy} onClick={() => adjustStock(f, -step)} className="size-7 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40">−</motion.button>
                  <span className="w-14 text-center font-mono tabular-nums text-white">{camp[f]}</span>
                  <motion.button whileTap={{ scale: 0.98 }} type="button" aria-label={`Increase ${l}`} disabled={busy} onClick={() => adjustStock(f, step)} className="size-7 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40">+</motion.button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <form className={`${card} space-y-3 p-4`} onSubmit={async (e) => {
          e.preventDefault();
          const ok = await registerSurvivor({ ...p, age: Math.max(0, Number(p.age) || 0), medicalNeeds: p.medicalNeeds || "None" });
          if (ok) setP({ fullName: "", age: "30", medicalNeeds: "", familyGroupCode: "" });
        }}>
          <h2 className="text-sm font-semibold text-white">Register Displaced Person</h2>
          <input required placeholder="Full name" aria-label="Full name" value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" min={0} max={120} aria-label="Age" value={p.age} onChange={(e) => setP({ ...p, age: e.target.value })} className={input} />
            <input required placeholder="FAM-107" aria-label="Family group code" value={p.familyGroupCode} onChange={(e) => setP({ ...p, familyGroupCode: e.target.value.toUpperCase() })} className={input} />
          </div>
          <input placeholder="Medical needs (optional)" aria-label="Medical needs" value={p.medicalNeeds} onChange={(e) => setP({ ...p, medicalNeeds: e.target.value })} className={input} />
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={busy} className="w-full rounded-lg bg-[#10B981] py-2 text-sm font-bold text-[#04120C] hover:bg-[#34d399] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Register</motion.button>
        </form>
      </div>
      <RequestsPanel />
    </div>
  );
}
