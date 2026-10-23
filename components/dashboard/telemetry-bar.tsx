"use client";

import { useApp } from "@/components/providers";
import { ROLES } from "@/lib/types";

export default function TelemetryBar() {
  const { role, offline, outbox, syncStatus, lastSyncAt, live } = useApp();
  const syncLabel = offline ? "Local-only · unsynced" : syncStatus === "connected" ? "Server connected" : syncStatus === "connecting" ? "Connecting" : "Server unavailable";
  const lastSyncLabel = lastSyncAt ? `Last sync ${new Date(lastSyncAt).toLocaleTimeString()}` : "No sync yet";
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap gap-x-2 border-t border-white/10 bg-[#020408]/95 px-4 py-2 font-mono text-[11px] text-slate-400 backdrop-blur">
      <span className={offline || syncStatus === "disconnected" ? "text-[#F59E0B]" : "text-[#10B981]"}>{syncLabel}</span>
      {offline && ` · ${outbox.length} queued on this device`}
      {!offline && ` · ${lastSyncLabel}${live ? " · refresh every 3s" : " · refresh paused"}`}
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <span className="ml-2 text-[#F59E0B]">· DEMO DATA</span>}
      {" | Role: "}<span className="text-[#38BDF8]">{role ? ROLES[role].short : "—"}</span>
    </footer>
  );
}
