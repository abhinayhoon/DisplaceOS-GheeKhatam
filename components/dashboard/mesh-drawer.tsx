"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { hopFor } from "@/lib/offline";
import { useOverlay } from "@/lib/use-scroll-lock";

const HOPS = ["VHF", "LoRa", "Local-LAN"] as const;

export default function MeshDrawer() {
  const { meshOpen, setMeshOpen, offline, setOffline, outbox, syncOutbox, syncing } = useApp();
  useOverlay(meshOpen, () => setMeshOpen(false));
  return (
    <AnimatePresence>
      {meshOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMeshOpen(false)} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
          <motion.aside role="dialog" aria-label="Offline architecture and field sync" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 30 }}
            data-lenis-prevent className="fixed inset-y-0 right-0 z-[85] w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0B1220]/95 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-[#38BDF8]">📡 OFFLINE ARCHITECTURE & FIELD SYNC</p>
                <h2 className="mt-1 text-lg font-bold text-white">Zero-Internet Mode</h2>
              </div>
              <button type="button" aria-label="Close drawer" onClick={() => setMeshOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <button type="button" role="switch" aria-checked={offline} onClick={() => setOffline(!offline)}
              className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${offline ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"}`}>
              <span>{offline ? "OFFLINE FIELD MODE (Cloud Severed)" : "ONLINE · Cloud uplink active"}</span>
              <span className={`relative h-5 w-9 rounded-full ${offline ? "bg-[#F59E0B]" : "bg-[#10B981]"}`}>
                <motion.span layout className="absolute top-0.5 size-4 rounded-full bg-white" style={{ left: offline ? 18 : 2 }} />
              </span>
            </button>
            <ol className="mt-4 space-y-1.5 text-xs text-slate-400">
              <li><b className="text-slate-200">1 · Capture.</b> Writes land in a persistent localStorage outbox (<code className="text-[#38BDF8]">displaceos_offline_outbox</code>); UI updates optimistically.</li>
              <li><b className="text-slate-200">2 · Relay.</b> Packets hop VHF (≤128 B) → LoRa (≤255 B) → local LAN between field units.</li>
              <li><b className="text-slate-200">3 · Burst sync.</b> When a LAN node reaches the SQLite host, the outbox flushes in one atomic transaction with RBAC checked per packet.</li>
              <li><b className="text-slate-200">4 · Local assets.</b> Map, icons, charts and fonts are bundled; nothing calls a cloud API.</li>
            </ol>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">Mesh outbox · {outbox.length} packet{outbox.length === 1 ? "" : "s"}</h3>
            <ul className="mt-2 space-y-2">
              {outbox.length === 0 && <li className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No queued packets. Toggle OFFLINE, then submit an SOS or register a survivor.</li>}
              {outbox.map((p) => {
                const hop = hopFor(p.bytes);
                return (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-white">{p.action}</span>
                      <span className="rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] text-[#F59E0B]">OFFLINE_QUEUED</span>
                    </div>
                    <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-snug text-slate-300">{JSON.stringify(p.payload, null, 1)}</pre>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{p.bytes} B · {p.badgeId}</span>
                      <span className="flex gap-1">{HOPS.map((h) => <span key={h} className={`rounded px-1.5 py-0.5 ${h === hop ? (syncing ? "animate-pulse bg-[#38BDF8]/30 text-[#38BDF8]" : "bg-[#10B981]/20 text-[#10B981]") : "bg-white/5"}`}>{h}{h === hop ? (syncing ? " relaying" : " ready") : ""}</span>)}</span>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={!outbox.length || syncing} onClick={syncOutbox}
              className="mt-4 w-full rounded-lg bg-[#38BDF8] py-2.5 text-sm font-bold text-[#04121C] hover:bg-[#7dd3fc] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              {syncing ? "Relaying packets…" : "⚡ Burst Sync via Local Mesh to SQLite"}
            </motion.button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
