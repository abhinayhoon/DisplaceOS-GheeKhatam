"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";

const VEH: Record<string, string> = { NDRF_BOAT: "🚤 NDRF Boat", HELI_AIRLIFT: "🚁 Heli Airlift", HEAVY_TRUCK: "🚚 Heavy Truck" };
const ROUTE: Record<string, string> = { CLEAR: "#10B981", LANDSLIDE_DETOUR: "#F59E0B", DELIVERED: "#38BDF8" };

export default function RescueView() {
  const { data, setDispatch, advance, busy, can, deny } = useApp();
  if (!data) return null;
  const act = (fn: () => void) => (can("DISPATCH") ? fn() : deny("DISPATCH"));
  return (
    <motion.section variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" aria-label="Active dispatch missions" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.dispatches.map((d) => {
        const done = d.routeStatus === "DELIVERED";
        return (
          <motion.article variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.02, translateY: -2 }} key={d.id} className={`${card} p-4`} style={{ borderColor: `${ROUTE[d.routeStatus]}44` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-white">{d.unitCode}</h3>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: ROUTE[d.routeStatus], background: `${ROUTE[d.routeStatus]}22` }}>{d.routeStatus}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{d.teamName} · {VEH[d.vehicleType] ?? d.vehicleType}</p>
            <p className="mt-3 text-sm text-slate-200">{d.originName} → <b>{d.targetCampName}</b></p>
            <p className="text-xs text-slate-400">{d.quantity} × {d.resourceType} · ETA {done ? "—" : `${d.etaMinutes} min`}</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${d.progressPercent}%`, background: ROUTE[d.routeStatus] }} /></div>
            <div className="mt-4 flex gap-2">
              <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || done} onClick={() => act(() => setDispatch(d.id, d.routeStatus === "LANDSLIDE_DETOUR" ? "CLEAR" : "LANDSLIDE_DETOUR"))}
                className="flex-1 rounded-lg border border-[#F59E0B]/40 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
                {!can("DISPATCH") && "🔒 "}{d.routeStatus === "LANDSLIDE_DETOUR" ? "Clear route" : "Toggle LANDSLIDE_DETOUR"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || done} onClick={() => act(() => advance(d.id))}
                className="rounded-lg border border-[#38BDF8]/40 px-2 py-2 text-xs font-semibold text-[#38BDF8] hover:bg-[#38BDF8]/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
                +25%
              </motion.button>
              <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || done} onClick={() => act(() => setDispatch(d.id, "DELIVERED"))}
                className="flex-1 rounded-lg bg-[#10B981] py-2 text-xs font-bold text-[#04120C] hover:bg-[#34d399] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                {!can("DISPATCH") && "🔒 "}Mark DELIVERED
              </motion.button>
            </div>
          </motion.article>
        );
      })}
    </motion.section>
  );
}
