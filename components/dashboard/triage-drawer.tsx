"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { useOverlay } from "@/lib/use-scroll-lock";

export default function TriageDrawer() {
  const { data, triageId, setTriageId } = useApp();
  const w = data?.weights;
  const r = data?.requests.find((x) => x.id === triageId);
  useOverlay(!!triageId, () => setTriageId(null));

  let j: Record<string, unknown> = {};
  try { j = r ? JSON.parse(r.reasoningJson) : {}; } catch { j = { raw: r?.reasoningJson }; }
  const occ = Number(j.occupancy), def = Number(j.deficit), run = Number(j.runwayHours);
  const calc = occ && run ? Math.round((occ * def) / run) : null;

  return (
    <AnimatePresence>
      {r && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTriageId(null)} />
          <motion.aside data-lenis-prevent role="dialog" aria-modal="true" aria-label="Triage algorithm" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-[70] w-[min(94vw,460px)] overflow-y-auto border-l border-white/10 bg-[#0F1624] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#38BDF8]">Request scoring heuristic · not a clinical triage protocol</p>
                <h2 className="text-lg font-semibold text-white">{r.campName} · {r.resourceType}</h2>
              </div>
              <motion.button whileTap={{ scale: 0.98 }} type="button" autoFocus aria-label="Close" onClick={() => setTriageId(null)} className="rounded p-1 text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">✕</motion.button>
            </div>
            <div className="mt-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4">
              <p className="text-xs text-slate-400">Urgency score</p>
              <p className="text-4xl font-bold tabular-nums text-[#EF4444]">{r.urgencyScore}</p>
              <p className="mt-2 font-mono text-xs text-slate-300">Occupancy × Deficit ÷ Survival Runway Hours</p>
              {calc !== null && <p className="mt-1 font-mono text-xs text-slate-400">{occ} × {def} ÷ {run} = {calc}</p>}
            </div>
            {w && (
              <div className="mt-4 rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/10 p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#A855F7]">Heuristic weight adjustment · not machine learning</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">score = base × drift × (1 + penalty × facilityDeficit) ÷ routeReliability</p>
                <dl className="mt-3 space-y-2 text-xs">
                  {([["Route Reliability Weight", w.routeReliability, 0.5, 1.5], ["Burn-Rate Drift Multiplier", w.burnDrift, 1, 1.5], ["Facility Deficit Penalty", w.facilityPenalty, 0.1, 0.6]] as const).map(([l, v, lo, hi]) => (
                    <div key={l}>
                      <div className="flex justify-between"><dt className="text-slate-300">{l}</dt><dd className="font-mono tabular-nums text-white">{v.toFixed(3)}</dd></div>
                      <div className="mt-1 h-1 rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-[#A855F7]" initial={false} animate={{ width: `${((v - lo) / (hi - lo)) * 100}%` }} /></div>
                    </div>
                  ))}
                </dl>
                <h4 className="mb-1 mt-3 text-[10px] uppercase tracking-widest text-slate-500">Recent calibrations</h4>
                <ul data-lenis-prevent className="max-h-28 space-y-1 overflow-y-auto font-mono text-[10px] text-slate-400">
                  {w.history.length === 0 && <li className="text-slate-600">No calibration events yet. Deliver a convoy or toggle a landslide detour.</li>}
                  {w.history.slice(0, 8).map((h, i) => <li key={i}><span className="text-[#A855F7]">{h.trigger}</span> · {h.weights}</li>)}
                </ul>
              </div>
            )}
            <div className={`mt-4 rounded-xl border p-4 text-sm ${r.duplicateFlag ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"}`}>
              {r.duplicateFlag ? "⚠ Potential duplicate — a matching open request was found when this request was created" : "No matching open request was found when this request was created"}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate-500">Status</dt><dd className="text-white">{r.status}</dd></div>
              <div><dt className="text-slate-500">Quantity</dt><dd className="font-mono text-white">{r.quantityNeeded}</dd></div>
              <div><dt className="text-slate-500">District</dt><dd className="text-white">{r.district}</dd></div>
              <div><dt className="text-slate-500">Created</dt><dd className="text-white">{new Date(r.createdAt).toLocaleString()}</dd></div>
            </dl>
            <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">Reasoning audit trail</h3>
            <pre className="overflow-x-auto rounded-xl bg-[#020408] p-4 font-mono text-xs text-[#38BDF8]">{JSON.stringify(j, null, 2)}</pre>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
