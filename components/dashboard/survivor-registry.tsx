"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";
import { useState } from "react";

const STATUSES = ["NEEDS_MEDEVAC", "SAFE_IN_CAMP", "REUNITED"] as const;
const COLOR: Record<string, string> = { NEEDS_MEDEVAC: "#EF4444", SAFE_IN_CAMP: "#10B981", REUNITED: "#38BDF8" };

export default function SurvivorRegistry() {
  const { data, survivorQuery, setSurvivorQuery, savePerson, busy, can } = useApp();
  const [filter, setFilter] = useState<string>("ALL");
  const q = survivorQuery.trim().toLowerCase();
  const rows = (data?.people ?? []).filter(
    (p) => (filter === "ALL" || p.status === filter) && (!q || p.fullName.toLowerCase().includes(q) || p.familyGroupCode.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)),
  );
  return (
    <section id="registry" className={`${card} scroll-mt-24 p-4`} aria-label="Survivor finder">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white">Survivor Finder & Family Reunification</h2>
        <input type="search" aria-label="Search survivors" placeholder="Search name, family code, status…" value={survivorQuery} onChange={(e) => setSurvivorQuery(e.target.value)}
          className="ml-auto w-full max-w-xs rounded-lg border border-white/10 bg-[#030712] px-3 py-2 text-sm text-white outline-none focus:border-[#38BDF8]" />
        <div className="flex gap-1">
          {["ALL", ...STATUSES].map((s) => (
            <motion.button whileTap={{ scale: 0.98 }} key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400 aria-pressed:border-[#38BDF8]/60 aria-pressed:bg-[#38BDF8]/15 aria-pressed:text-white">{s}</motion.button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-2">Name</th><th>Age</th><th>Family</th><th>Camp</th><th>Medical</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="py-2 text-slate-200">{p.fullName}</td>
                <td className="tabular-nums">{p.age}</td>
                <td className="font-mono">{p.familyGroupCode}</td>
                <td>{p.currentCampName}<span className="block text-[10px] text-slate-500">{p.district}</span></td>
                <td className="text-slate-400">{p.medicalNeeds}</td>
                <td>
                  <select aria-label={`Status for ${p.fullName}`} value={p.status} disabled={busy || !can("TRIAGE_STATUS")}
                    onChange={(e) => savePerson({ ...p, status: e.target.value }, `${p.fullName} → ${e.target.value}`)}
                    className="rounded border border-white/10 bg-[#030712] px-2 py-1 text-xs" style={{ color: COLOR[p.status] }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No survivors match.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
