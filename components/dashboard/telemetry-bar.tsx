"use client";

import { useApp } from "@/components/providers";
import { ROLES } from "@/lib/types";

export default function TelemetryBar() {
  const { role, offline, outbox } = useApp();
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#030712]/95 px-4 py-2 font-mono text-[11px] text-slate-400 backdrop-blur">
      {offline ? <span className="text-[#F59E0B]">📡 OFFLINE FIELD MODE · {outbox.length} queued</span> : <span className="text-[#10B981]">⚡ DisplaceOS Engine: Online</span>} | DB: SQLite/Prisma Real-Time Sync | Active RBAC Role: <span className="text-[#38BDF8]">{role ? ROLES[role].short : "—"}</span> | Cmd+K Palette Ready
    </footer>
  );
}
