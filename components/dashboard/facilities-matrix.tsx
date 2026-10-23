"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { accuracyOf } from "@/lib/accuracy";
import { FACILITY_KEYS, facilityDeficit, health, parseFacilities, type FacilityKey, type Facilities } from "@/lib/facilities";
import { campTone, card, TONE_HEX, type Camp } from "@/lib/types";

const LABEL: Record<FacilityKey, string> = { power: "⚡ Power", wash: "🚿 WASH", filtration: "💧 Filtration", medical: "🏥 Medical", comms: "📶 Comms" };
const tone = (v: number) => (v < 35 ? "#EF4444" : v < 65 ? "#F59E0B" : "#10B981");

function detail(k: FacilityKey, f: Facilities) {
  switch (k) {
    case "power": return `${f.power.source} ${f.power.pct}% · ${f.power.backupHours}h backup`;
    case "wash": return `${f.wash.bioToilets} bio-toilets · ${f.wash.hygieneKits} kits · contamination ${f.wash.contamination}`;
    case "filtration": return `${f.filtration.type} ${f.filtration.capacityLph} L/h · ${f.filtration.pct}%`;
    case "medical": return `ICU ${f.medical.icuBeds} · trauma ${f.medical.traumaBeds} · cold-chain ${f.medical.coldChainPct}% · O₂ ${f.medical.oxygenCylinders}`;
    case "comms": return `${f.comms.link} ${f.comms.signalPct}%`;
  }
}

function CampCard({ c }: { c: Camp }) {
  const { role, user, can, deny, requestFacility, busy } = useApp();
  const f = parseFacilities(c), h = health(f), acc = accuracyOf(c);
  const mine = role !== "RELIEF_CAMP" || user?.campName === c.name;
  const weakest = [...FACILITY_KEYS].sort((a, b) => h[a] - h[b])[0];
  const t = TONE_HEX[campTone(c)];
  const req = (k: FacilityKey) => (!can("FACILITY") || !mine ? deny("FACILITY") : requestFacility(k, c.id));
  return (
    <motion.article variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ translateY: -2 }} className={`${card} p-4`} style={{ borderColor: `${t}44` }}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{c.name}</h3>
          <p className="text-[10px] text-slate-500">{c.district} · deficit {Math.round(facilityDeficit(f) * 100)}%</p>
        </div>
        <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ color: acc.anomaly ? "#EF4444" : "#10B981", background: acc.anomaly ? "#EF444422" : "#10B98122" }}>🛡️ {acc.score}%</span>
      </div>
      <ul className="mt-3 space-y-2">
        {FACILITY_KEYS.map((k) => (
          <li key={k} className="text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300">{LABEL[k]}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono tabular-nums" style={{ color: tone(h[k]) }}>{h[k]}%</span>
                <button type="button" disabled={busy || f.repairRequested.includes(k)} onClick={() => req(k)} aria-label={`Request ${k} repair for ${c.name}`}
                  className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40">
                  {f.repairRequested.includes(k) ? "requested" : "🛠"}
                </button>
              </span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-white/10"><motion.div className="h-full rounded-full" initial={false} animate={{ width: `${h[k]}%` }} style={{ background: tone(h[k]) }} /></div>
            <p className="mt-0.5 text-[10px] text-slate-500">{detail(k, f)}</p>
          </li>
        ))}
      </ul>
      <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || f.repairRequested.includes(weakest)} onClick={() => req(weakest)}
        className="mt-3 w-full rounded-lg border border-[#38BDF8]/40 py-2 text-xs font-semibold text-[#38BDF8] hover:bg-[#38BDF8]/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
        {can("FACILITY") && mine ? "" : "🔒 "}Request Facility Upgrade / Repair · {weakest}
      </motion.button>
    </motion.article>
  );
}

export default function FacilitiesMatrix() {
  const { data } = useApp();
  if (!data) return null;
  return (
    <section aria-label="Camp facilities matrix">
      <h2 className="mb-3 text-sm font-semibold text-white">Camp Facilities & Infrastructure Matrix</h2>
      <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.camps.map((c) => <CampCard key={c.id} c={c} />)}
      </motion.div>
    </section>
  );
}
