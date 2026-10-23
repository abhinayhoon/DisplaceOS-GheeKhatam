"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { campTone, card, runwayHours, TONE_HEX } from "@/lib/types";
import { accuracyOf } from "@/lib/accuracy";
import { FACILITY_KEYS, health, parseFacilities } from "@/lib/facilities";

const W = 800, H = 500;
const px = (lng: number) => ((lng - 77.9) / (79.5 - 77.9)) * (W - 60) + 30;
const py = (lat: number) => ((30.85 - lat) / (30.85 - 30.2)) * (H - 60) + 30;

const DEPOTS: Record<string, [number, number]> = {
  "Chamoli Depot": [30.47, 79.26],
  "Dehradun Central Depot": [30.3165, 78.0322],
  "Tehri Depot": [30.3, 78.58],
};
const DISTRICTS = [
  { n: "UTTARKASHI", lat: 30.8, lng: 78.45 },
  { n: "TEHRI", lat: 30.46, lng: 78.52 },
  { n: "CHAMOLI", lat: 30.58, lng: 79.28 },
  { n: "RUDRAPRAYAG", lat: 30.22, lng: 79.0 },
];

export default function TacticalMap() {
  const { data, selectedCampId, setSelectedCampId, selectedDepot, setSelectedDepot } = useApp();
  if (!data) return <div className={`${card} h-[420px] animate-pulse`} />;
  const camps = data.camps;
  const pos = (name: string): [number, number] | null => {
    const c = camps.find((x) => x.name === name);
    if (c) return [px(c.lng), py(c.lat)];
    const d = DEPOTS[name];
    return d ? [px(d[1]), py(d[0])] : null;
  };
  const sel = camps.find((c) => c.id === selectedCampId);

  return (
    <div className={`${card} grid gap-0 overflow-hidden lg:grid-cols-[1fr_280px]`}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tactical map of Uttarkashi, Chamoli, Rudraprayag and Tehri relief camps" className="block w-full bg-[#020408]">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.04)" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          {DISTRICTS.map((d) => (
            <text key={d.n} x={px(d.lng)} y={py(d.lat)} textAnchor="middle" fill="#38BDF8" opacity={0.35} fontSize="15" fontWeight="700" letterSpacing="4">{d.n}</text>
          ))}
          {data.dispatches.filter((d) => d.routeStatus !== "DELIVERED").map((d) => {
            const a = pos(d.originName), b = pos(d.targetCampName);
            if (!a || !b) return null;
            const detour = d.routeStatus === "LANDSLIDE_DETOUR";
            const color = d.resourceType === "REINFORCEMENT" ? "#A855F7" : detour ? "#F59E0B" : "#38BDF8";
            const t = d.progressPercent / 100;
            const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - (detour ? 50 : 20);
            const cx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mx + t * t * b[0];
            const cy = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * my + t * t * b[1];
            return (
              <g key={d.id}>
                <motion.path d={`M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`} fill="none" stroke={color} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.8}
                  animate={{ strokeDashoffset: [0, -24] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                <motion.circle r={4.5} fill={color} initial={false} animate={{ cx, cy }} transition={{ duration: 1 }} />
                <text x={cx + 8} y={cy - 6} fill={color} fontSize="9" fontFamily="monospace">{d.unitCode}</text>
              </g>
            );
          })}
          {Object.keys(DEPOTS).map((n) => {
            const p = pos(n)!;
            return (
              <g key={n} role="button" tabIndex={0} aria-label={`${n} depot`} className="cursor-pointer outline-none"
                onClick={() => { setSelectedCampId(null); setSelectedDepot(selectedDepot === n ? null : n); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCampId(null); setSelectedDepot(selectedDepot === n ? null : n); } }}>
                <rect x={p[0] - 7} y={p[1] - 7} width={14} height={14} rx={3} fill="#0F1624" stroke="#38BDF8" strokeWidth={1.5} />
                <text x={p[0]} y={p[1] + 3.5} textAnchor="middle" fontSize="9" fill="#38BDF8">▣</text>
                <text x={p[0]} y={p[1] + 22} textAnchor="middle" fontSize="9" fill="#94a3b8">{n}</text>
              </g>
            );
          })}
          {camps.map((c) => {
            const tone = campTone(c), color = TONE_HEX[tone];
            const x = px(c.lng), y = py(c.lat), active = c.id === selectedCampId;
            return (
              <g key={c.id} role="button" tabIndex={0} aria-label={`${c.name}, ${tone}, runway ${runwayHours(c).toFixed(1)} hours`} className="cursor-pointer outline-none"
                onClick={() => { setSelectedDepot(null); setSelectedCampId(active ? null : c.id); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDepot(null); setSelectedCampId(active ? null : c.id); } }}>
                {tone === "CRITICAL" && (
                  <motion.circle cx={x} cy={y} fill={color} initial={{ r: 8, opacity: 0.5 }} animate={{ r: 26, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} />
                )}
                <circle cx={x} cy={y} r={active ? 12 : 9} fill={color} stroke={active ? "#fff" : "#020408"} strokeWidth={2.5} />
                <text x={x} y={y - 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#e2e8f0">{c.name}</text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 left-3 flex gap-3 text-[10px] text-slate-400">
          <span><i className="mr-1 inline-block size-2 rounded-full bg-[#EF4444]" />CRITICAL</span>
          <span><i className="mr-1 inline-block size-2 rounded-full bg-[#F59E0B]" />OVERFLOW</span>
          <span><i className="mr-1 inline-block size-2 rounded-full bg-[#10B981]" />STABLE</span>
          <span><i className="mr-1 inline-block size-2 bg-[#38BDF8]" />DEPOT</span>
        </div>
      </div>
      <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
        {sel ? <CampInspector id={sel.id} /> : selectedDepot ? <DepotInspector name={selectedDepot} /> : <p className="text-sm text-slate-500">Select a camp or depot node to inspect recorded inventory.</p>}
      </aside>
    </div>
  );
}

function CampInspector({ id }: { id: string }) {
  const { data, setSelectedCampId } = useApp();
  const c = data?.camps.find((x) => x.id === id);
  if (!c) return null;
  const tone = campTone(c);
  const rows: [string, number, number][] = [
    ["Food packets", c.foodPackets, c.currentOccupancy * 6],
    ["Water (L)", c.waterLiters, c.currentOccupancy * 15],
    ["Medical kits", c.medicalKits, Math.ceil(c.currentOccupancy / 4)],
    ["Shelter tents", c.shelterTents, Math.ceil(c.currentOccupancy / 4)],
  ];
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{c.name}</h3>
          <p className="text-xs text-slate-500">{c.district}</p>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} type="button" aria-label="Clear selection" onClick={() => setSelectedCampId(null)} className="text-slate-500 hover:text-white">✕</motion.button>
      </div>
      <p className="mt-3 text-xs" style={{ color: TONE_HEX[tone] }}>{tone} · runway {runwayHours(c).toFixed(1)}h</p>
      <p className="mt-1 text-xs text-slate-400">Occupancy {c.currentOccupancy}/{c.capacity} · burn {c.burnRatePerHour}/h</p>
      <ul className="mt-4 space-y-3">
        {rows.map(([l, v, need]) => (
          <li key={l}>
            <div className="flex justify-between text-xs"><span className="text-slate-400">{l}</span><span className="font-mono tabular-nums text-white">{v}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / Math.max(need, 1)) * 100)}%`, background: v < need * 0.3 ? "#EF4444" : "#10B981" }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-500">Facilities · 🛡️ accuracy {accuracyOf(c).score}%</p>
      <ul className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px]">
        {FACILITY_KEYS.map((k) => {
          const v = health(parseFacilities(c))[k];
          return <li key={k} className="rounded bg-white/5 p-1"><span className="block text-slate-500">{k.slice(0, 4)}</span><span className="font-mono" style={{ color: v < 35 ? "#EF4444" : v < 65 ? "#F59E0B" : "#10B981" }}>{v}%</span></li>;
        })}
      </ul>
    </div>
  );
}

function DepotInspector({ name }: { name: string }) {
  const { data, setSelectedDepot } = useApp();
  const d = data?.depots.find((x) => x.name === name);
  if (!d) return null;
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{d.name}</h3>
          <p className="text-xs text-slate-500">{d.district} · DEPOT</p>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} type="button" aria-label="Clear selection" onClick={() => setSelectedDepot(null)} className="text-slate-500 hover:text-white">✕</motion.button>
      </div>
      <ul className="mt-4 space-y-2 text-xs">
        {([["Food", d.foodStock], ["Water (L)", d.waterStock], ["Medicine", d.medicineStock], ["Shelter", d.shelterStock]] as const).map(([l, v]) => (
          <li key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-mono tabular-nums text-white">{v}</span></li>
        ))}
      </ul>
    </div>
  );
}
