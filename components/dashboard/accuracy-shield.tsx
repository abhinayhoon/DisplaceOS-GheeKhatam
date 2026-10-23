"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { accuracyOf } from "@/lib/accuracy";
import { card } from "@/lib/types";

const col = (v: number | null) => (v == null ? "#64748b" : v >= 80 ? "#10B981" : v >= 55 ? "#F59E0B" : "#EF4444");

export default function AccuracyShield() {
  const { data, can, deny, verify, busy } = useApp();
  const [fieldCounts, setFieldCounts] = useState<Record<string, string>>({});
  if (!data) return null;
  const rows = data.camps.map((c) => ({ c, a: accuracyOf(c) })).sort((x, y) => x.a.score - y.a.score);
  return (
    <section className={`${card} p-4`} aria-label="Stock consistency estimates and field count records">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white">Stock Consistency Estimates</h2>
        <span className="font-mono text-[10px] text-slate-500">OPERATOR RECORD × BURN-RATE ESTIMATE × FIELD COUNT</span>
        <span className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: col(data.metrics.avgConfidence), background: `${col(data.metrics.avgConfidence)}22` }}>
          Mean agreement estimate {data.metrics.avgConfidence}% · {data.metrics.anomalies} mismatch{data.metrics.anomalies === 1 ? "" : "es"}
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">This heuristic is not a probability and is not independently verified. Enter a food count observed in the field to add a field-count record; the app does not read a sensor.</p>
      <div data-lenis-prevent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Camp</th><th>Agreement estimate</th><th>Recorded stock</th><th>Burn estimate</th><th>Last field count</th><th>Difference</th><th>Observed count</th><th /></tr>
          </thead>
          <tbody>
            {rows.map(({ c, a }) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="py-2 text-slate-200">{c.name}</td>
                <td><span className="font-mono font-semibold tabular-nums" style={{ color: col(a.score) }}>{a.score}%</span></td>
                <td className="font-mono tabular-nums">{a.reported}</td>
                <td className="font-mono tabular-nums">{a.modelExpected}</td>
                <td className="font-mono tabular-nums">{a.groundTruth ?? "—"}</td>
                <td>{a.anomaly ? <span className="rounded bg-[#EF4444]/20 px-1.5 py-0.5 text-[#EF4444]">⚠ {a.driftPct > 0 ? "+" : ""}{a.driftPct}% model mismatch</span> : <span className="text-slate-500">{a.driftPct > 0 ? "+" : ""}{a.driftPct}%</span>}</td>
                <td>
                  <input
                    aria-label={`Observed food packet count at ${c.name}`}
                    type="number" min={0} max={10_000_000} step={1}
                    value={fieldCounts[c.id] ?? ""}
                    onChange={(event) => setFieldCounts((counts) => ({ ...counts, [c.id]: event.target.value }))}
                    className="w-28 rounded border border-white/10 bg-[#020408] px-2 py-1 font-mono text-xs text-white"
                    placeholder="Field count"
                  />
                </td>
                <td className="py-1 text-right">
                  <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || fieldCounts[c.id] === undefined || fieldCounts[c.id] === ""} onClick={() => {
                    if (!can("VERIFY")) return deny("VERIFY");
                    const measured = Number(fieldCounts[c.id]);
                    if (Number.isSafeInteger(measured) && measured >= 0 && measured <= 10_000_000) verify(c.id, measured);
                  }}
                    className={`rounded px-2 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8] disabled:opacity-40 ${a.anomaly ? "bg-[#EF4444] text-white hover:bg-[#dc2626]" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}>
                    {can("VERIFY") ? "" : "🔒 "}Record field count
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Hash-linked audit history</h3>
      <ul className="space-y-1 font-mono text-[10px] text-slate-400">
        {data.verifications.length === 0 && <li className="text-slate-600">No audits yet.</li>}
        {data.verifications.slice(0, 5).map((v) => (
          <li key={v.id} className="truncate">{new Date(v.createdAt).toLocaleTimeString()} · {v.campName} · {v.accuracyBefore}%→{v.accuracyAfter}% · <span className="text-[#38BDF8]">{v.hash.slice(0, 16)}…</span> ← {v.prevHash.slice(0, 8)}</li>
        ))}
      </ul>
    </section>
  );
}
