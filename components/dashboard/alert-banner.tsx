"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";

export default function AlertBanner() {
  const { data, can, rebalance, busy } = useApp();
  if (!data) return null;
  const dups = data.requests.filter((r) => r.duplicateFlag && r.status !== "DELIVERED");
  const dupAll = data.requests.filter((r) => r.duplicateFlag);
  const medShort = data.camps.filter((c) => c.medicalKits < 20);
  const medSurplus = data.depots.filter((d) => d.medicineStock > 100);
  const show = dupAll.length > 0 || (medShort.length > 0 && medSurplus.length > 0);
  return (
    <AnimatePresence>
      {show && (
        <motion.section initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
          aria-live="polite" className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4">
          <div className="text-2xl" aria-hidden>⚠️</div>
          <div className="min-w-[240px] flex-1 text-sm">
            <p className="font-semibold text-[#F59E0B]">Supply mismatch & duplication detected</p>
            <p className="mt-1 text-slate-300">
              {dupAll.length} duplicate shipment{dupAll.length === 1 ? "" : "s"} ({dups.length} still active) ·{" "}
              {medShort.length > 0 ? `${medShort.map((c) => c.name).join(", ")} short on medicine while ${medSurplus.map((d) => `${d.name} holds ${d.medicineStock} kits`).join(", ") || "depots hold surplus"}` : "no medicine gap"}
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || !can("REBALANCE")} onClick={rebalance}
            className="rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#1a1100] hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {can("REBALANCE") ? "Reroute Surplus Now" : "🔒 Gov Agency only"}
          </motion.button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
