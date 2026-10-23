"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { accuracyOf } from "@/lib/accuracy";
import { card } from "@/lib/types";

const col = (v: number | null) => (v == null ? "#64748b" : v >= 80 ? "#10B981" : v >= 55 ? "#F59E0B" : "#EF4444");

export default function AccuracyShield() {
  const { data, can, deny, verify, busy } = useApp();
  if (!data) return null;
  const rows = data.camps.map((c) => ({ c, a: accuracyOf(c) })).sort((x, y) => x.a.score - y.a.score);
  return (
    <section className={`${card} p-4`} aria-label="Data accuracy and anomaly shield">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white">🛡️ Data Accuracy & Anomaly Shield</h2>
        <span className="font-mono text-[10px] text-slate-500">CAMP_LOG × BURN_RATE_MODEL × FIELD_GROUND_TRUTH</span>
        <span className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: col(data.metrics.avgConfidence), background: `${col(data.metrics.avgConfidence)}22` }}>
          Network confidence {data.metrics.avgConfidence}% · {data.metrics.anomalies} anomal{data.metrics.anomalies === 1 ? "y" : "ies"}
        </span>
      </div>
      <div data-lenis-prevent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Camp</th><th>Score</th><th>Camp log</th><th>Burn model</th><th>Ground truth</th><th>Drift</th><th /></tr>
          </thead>
          <tbody>
            {rows.map(({ c, a }) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="py-2 text-slate-200">{c.name}</td>
                <td><span className="font-mono font-semibold tabular-nums" style={{ color: col(a.score) }}>{a.score}%</span></td>
                <td className="font-mono tabular-nums">{a.reported}</td>
                <td className="font-mono tabular-nums">{a.modelExpected}</td>
                <td className="font-mono tabular-nums">{a.groundTruth ?? "—"}</td>
                <td>{a.anomaly ? <span className="rounded bg-[#EF4444]/20 px-1.5 py-0.5 text-[#EF4444]">⚠ {a.driftPct > 0 ? "+" : ""}{a.driftPct}% SPOOF/DRIFT</span> : <span className="text-slate-500">{a.driftPct > 0 ? "+" : ""}{a.driftPct}%</span>}</td>
                <td className="py-1 text-right">
                  <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={() => (can("VERIFY") ? verify(c.id) : deny("VERIFY"))}
                    className={`rounded px-2 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8] disabled:opacity-40 ${a.anomaly ? "bg-[#EF4444] text-white hover:bg-[#dc2626]" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}>
                    {can("VERIFY") ? "" : "🔒 "}Verify & Reconcile Ground Truth
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Immutable verification ledger</h3>
      <ul className="space-y-1 font-mono text-[10px] text-slate-400">
        {data.verifications.length === 0 && <li className="text-slate-600">No audits yet.</li>}
        {data.verifications.slice(0, 5).map((v) => (
          <li key={v.id} className="truncate">{new Date(v.createdAt).toLocaleTimeString()} · {v.campName} · {v.accuracyBefore}%→{v.accuracyAfter}% · <span className="text-[#38BDF8]">{v.hash.slice(0, 16)}…</span> ← {v.prevHash.slice(0, 8)}</li>
        ))}
      </ul>
    </section>
  );
}
