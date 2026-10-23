"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";
import { requestConfidence } from "@/lib/accuracy";

const STATUS_COLOR: Record<string, string> = { PENDING: "#EF4444", ALLOCATED: "#38BDF8", IN_TRANSIT: "#F59E0B", DELIVERED: "#10B981", RESOLVED: "#94a3b8", OFFLINE_QUEUED: "#F59E0B" };

export default function RequestsPanel({ approvable = false }: { approvable?: boolean }) {
  const { data, setTriageId, approve, can, deny, busy } = useApp();
  return (
    <section className={`${card} p-4`} aria-label="Resource requests">
      <h2 className="mb-3 text-sm font-semibold text-white">Resource Requests · ranked by urgency</h2>
      <div data-lenis-prevent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Camp</th><th>Type</th><th>Qty</th><th>Urgency heuristic</th><th>Input consistency</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {data?.requests.map((r) => (
              <tr key={r.id} onClick={() => setTriageId(r.id)} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 text-slate-200">{r.campName}<span className="block text-[10px] text-slate-500">{r.district}</span></td>
                <td>{r.resourceType}{r.duplicateFlag && <span className="ml-1 rounded bg-[#F59E0B]/20 px-1 text-[9px] text-[#F59E0B]">DUP</span>}</td>
                <td className="font-mono tabular-nums">{r.quantityNeeded}</td>
                <td className="font-mono tabular-nums text-white">{r.urgencyScore}</td>
                <td className="font-mono tabular-nums text-slate-300">🛡️ {requestConfidence(r, data.camps.find((c) => c.id === r.campId))}%</td>
                <td><span style={{ color: STATUS_COLOR[r.status] }}>{r.status === "OFFLINE_QUEUED" ? "LOCAL ONLY · NOT SYNCED" : r.status}</span></td>
                <td className="space-x-1 whitespace-nowrap py-1 text-right">
                  {approvable && r.status === "PENDING" && (
                    <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); if (can("APPROVE")) approve(r.id); else deny("APPROVE"); }}
                      className="rounded bg-[#10B981]/20 px-2 py-1 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">{can("APPROVE") ? "" : "🔒 "}Approve / Allocate</motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={(e) => { e.stopPropagation(); setTriageId(r.id); }}
                    className="rounded border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">Inspect Triage Algorithm</motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
