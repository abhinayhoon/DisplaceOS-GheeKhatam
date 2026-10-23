"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = { PENDING: "#EF4444", ALLOCATED: "#38BDF8", IN_TRANSIT: "#F59E0B", DELIVERED: "#10B981" };

export default function RequestsPanel({ approvable = false }: { approvable?: boolean }) {
  const { data, setTriageId, approve, can, busy } = useApp();
  return (
    <section className={`${card} p-4`} aria-label="Resource requests">
      <h2 className="mb-3 text-sm font-semibold text-white">Resource Requests · ranked by urgency</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Camp</th><th>Type</th><th>Qty</th><th>Urgency</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {data?.requests.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2 text-slate-200">{r.campName}<span className="block text-[10px] text-slate-500">{r.district}</span></td>
                <td>{r.resourceType}{r.duplicateFlag && <span className="ml-1 rounded bg-[#F59E0B]/20 px-1 text-[9px] text-[#F59E0B]">DUP</span>}</td>
                <td className="font-mono tabular-nums">{r.quantityNeeded}</td>
                <td className="font-mono tabular-nums text-white">{r.urgencyScore}</td>
                <td><span style={{ color: STATUS_COLOR[r.status] }}>{r.status}</span></td>
                <td className="space-x-1 whitespace-nowrap py-1 text-right">
                  {approvable && r.status === "PENDING" && (
                    <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy || !can("APPROVE")} onClick={() => approve(r.id)}
                      className="rounded bg-[#10B981]/20 px-2 py-1 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">Approve</motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setTriageId(r.id)}
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
