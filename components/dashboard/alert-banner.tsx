"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { detectMismatch, runwayHours, surplusPct } from "@/lib/types";

export default function AlertBanner() {
  const { data, can, rebalance, deny, busy } = useApp();
  if (!data) return null;
  const m = detectMismatch(data.camps, data.depots);
  const dups = data.metrics.activeDuplicates;
  const show = dups > 0 || !!m.food || !!m.medicine;
  return (
    <AnimatePresence>
      {show && (
        <motion.section initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} aria-live="polite"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 backdrop-blur-xl">
          <div className="text-2xl" aria-hidden>🚨</div>
          <div className="min-w-[240px] flex-1 text-sm">
            <p className="font-semibold text-[#EF4444]">Supply Mismatch Alert</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">
              {m.food && <li>{m.food.from.name} holds a <b>{surplusPct(m.food.from)}%</b> food surplus while {m.food.to.name} has only <b>{runwayHours(m.food.to).toFixed(1)}h</b> of survival runway.</li>}
              {m.medicine && <li>{m.medicine.from.name} holds <b>{m.medicine.from.medicineStock}</b> medical kits while {m.medicine.to.name} has <b>{m.medicine.to.medicalKits}</b>.</li>}
              {dups > 0 && <li>{dups} duplicate shipment{dups === 1 ? "" : "s"} still active.</li>}
            </ul>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={() => (can("REBALANCE") ? rebalance() : deny("REBALANCE"))}
            className="rounded-lg bg-[#10B981] px-4 py-2 text-xs font-bold text-[#04120C] hover:bg-[#34d399] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            🧠 {can("REBALANCE") ? "" : "🔒 "}Create Suggested Transfers
          </motion.button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
