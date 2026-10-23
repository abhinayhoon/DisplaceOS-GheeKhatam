"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers";
import { useOverlay } from "@/lib/use-scroll-lock";

export default function MeshDrawer() {
  const { meshOpen, setMeshOpen, offline, setOffline, outbox, syncOutbox, syncing, discardPacket } = useApp();
  useOverlay(meshOpen, () => setMeshOpen(false));
  return (
    <AnimatePresence>
      {meshOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMeshOpen(false)} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
          <motion.aside role="dialog" aria-label="Offline action queue" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 30 }}
            data-lenis-prevent className="fixed inset-y-0 right-0 z-[85] w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0B1220]/95 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-[#38BDF8]">DEVICE-ONLY ACTION QUEUE</p>
                <h2 className="mt-1 text-lg font-bold text-white">Offline queue</h2>
              </div>
              <button type="button" aria-label="Close drawer" onClick={() => setMeshOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <button type="button" role="switch" aria-checked={offline} onClick={() => setOffline(!offline)}
              className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${offline ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"}`}>
              <span>{offline ? "Local-only mode enabled" : "Server sync enabled"}</span>
              <span className={`relative h-5 w-9 rounded-full ${offline ? "bg-[#F59E0B]" : "bg-[#10B981]"}`}>
                <motion.span layout className="absolute top-0.5 size-4 rounded-full bg-white" style={{ left: offline ? 18 : 2 }} />
              </span>
            </button>
            <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100/80">
              Actions are stored in this browser only. The app does not relay over radio, LoRa, or peer devices. Browser storage can be cleared or lost; sync queued actions to the server as soon as connectivity returns.
            </div>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">Device queue · {outbox.length} action{outbox.length === 1 ? "" : "s"}</h3>
            <ul className="mt-2 space-y-2">
              {outbox.length === 0 && <li className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No queued actions. Enable local-only mode to try the browser queue.</li>}
              {outbox.map((p) => {
                return (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-white">{p.action}</span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] text-[#F59E0B]">DEVICE ONLY</span>
                        <button type="button" onClick={() => discardPacket(p.id)} className="text-[10px] text-slate-500 underline hover:text-white">Remove</button>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">Stored in this browser until sent; the queue is not encrypted.</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{p.bytes} B · {p.badgeId}</span>
                      <time dateTime={p.queuedAt}>{new Date(p.queuedAt).toLocaleTimeString()}</time>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={!outbox.length || syncing} onClick={syncOutbox}
              className="mt-4 w-full rounded-lg bg-[#38BDF8] py-2.5 text-sm font-bold text-[#04121C] hover:bg-[#7dd3fc] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              {syncing ? "Sending queued actions…" : "Sync queued actions"}
            </motion.button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
