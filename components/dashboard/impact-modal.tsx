"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { useOverlay } from "@/lib/use-scroll-lock";

const fmt = (v: number | null | undefined, unit = "") => (v == null ? "—" : `${v}${unit}`);

export default function ImpactModal() {
  const { impact, setImpact } = useApp();
  useOverlay(!!impact, () => setImpact(null));
  const rows: [string, string, string][] = impact
    ? [
        [`${impact.foodFrom ?? "Donor"} food packets`, fmt(impact.before.alphaFood), fmt(impact.after.alphaFood)],
        [`${impact.foodTo ?? "Shortage camp"} food packets`, fmt(impact.before.deltaFood), fmt(impact.after.deltaFood)],
        [`${impact.foodTo ?? "Shortage camp"} survival runway`, fmt(impact.before.deltaRunway, "h"), fmt(impact.after.deltaRunway, "h")],
        [`${impact.medTo ?? "Medicine camp"} medical kits`, fmt(impact.before.gammaKits), fmt(impact.after.gammaKits)],
        [`${impact.medFrom ?? "Depot"} medicine stock`, fmt(impact.before.depotKits), fmt(impact.after.depotKits)],
        ["Active duplicate shipments", fmt(impact.before.duplicates), fmt(impact.after.duplicates)],
        ["Active convoys", fmt(impact.before.convoys), fmt(impact.after.convoys)],
      ]
    : [];
  return (
    <AnimatePresence>
      {impact && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImpact(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <motion.div data-lenis-prevent role="dialog" aria-modal="true" aria-label="Rebalance impact summary" initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl border border-[#10B981]/30 bg-[#0B1220]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#10B981]">DISPATCH CREATED</p>
            <h2 className="mt-1 text-xl font-bold text-white">Rebalance · Dispatch Summary</h2>
            <p className="mt-2 text-sm text-slate-300">
              {impact.food > 0 && <>{impact.food} food packets {impact.foodFrom} → {impact.foodTo}. </>}
              {impact.medicine > 0 && <>{impact.medicine} medical kits {impact.medFrom} → {impact.medTo}. </>}
              Receiving stock is credited only after delivery is confirmed. Convoys: <span className="font-mono text-[#38BDF8]">{impact.convoys.join(", ")}</span>
            </p>
            <table className="mt-4 w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-1">Metric</th><th>Before</th><th>After dispatch</th></tr></thead>
              <tbody>
                {rows.map(([l, b, a], i) => (
                  <motion.tr key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }} className="border-t border-white/5">
                    <td className="py-2 text-slate-300">{l}</td>
                    <td className="font-mono tabular-nums text-[#EF4444]">{b}</td>
                    <td className="font-mono tabular-nums text-[#10B981]">{a}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setImpact(null)} className="mt-5 w-full rounded-lg bg-[#10B981] py-2 text-sm font-bold text-[#04120C] hover:bg-[#34d399] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Close</motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
