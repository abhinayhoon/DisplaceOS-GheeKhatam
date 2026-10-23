"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import Navbar from "@/components/dashboard/navbar";
import AlertBanner from "@/components/dashboard/alert-banner";
import TacticalMap from "@/components/dashboard/tactical-map";
import GovView from "@/components/dashboard/gov-view";
import CampView from "@/components/dashboard/camp-view";
import RescueView from "@/components/dashboard/rescue-view";
import TriageDrawer from "@/components/dashboard/triage-drawer";
import SurvivorRegistry from "@/components/dashboard/survivor-registry";
import TelemetryBar from "@/components/dashboard/telemetry-bar";

export default function DashboardPage() {
  const { role, data, sessionPending } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!sessionPending && !role) router.replace("/login?next=/dashboard");
  }, [sessionPending, role, router]);
  const crit = data?.camps.filter((c) => c.status === "CRITICAL").length ?? 0;
  const people = data?.people.length ?? 0;
  const open = data?.requests.filter((r) => r.status === "PENDING").length ?? 0;
  const stats: [string, number, string][] = [
    ["Critical camps", crit, "#EF4444"], ["Pending SOS", open, "#F59E0B"],
    ["Active convoys", data?.dispatches.filter((d) => d.routeStatus !== "DELIVERED").length ?? 0, "#38BDF8"], ["Registered survivors", people, "#10B981"],
  ];
  if (!role) return <main className="flex flex-1 items-center justify-center text-sm text-slate-500">Checking session…</main>;
  return (
    <>
      <Navbar />
      <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto w-full max-w-[1500px] flex-1 space-y-4 px-4 pb-16 pt-4">
        <AlertBanner />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([l, v, c]) => (
            <motion.div key={l} whileHover={{ scale: 1.02, translateY: -2 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
              <p className="text-3xl font-bold tabular-nums" style={{ color: c }}>{v}</p>
              <p className="text-xs text-slate-400">{l}</p>
            </motion.div>
          ))}
        </div>
        <TacticalMap />
        {role === "GOV_AGENCY" && <GovView />}
        {role === "RELIEF_CAMP" && <CampView />}
        {role === "RESCUE_TEAM" && <RescueView />}
        <SurvivorRegistry />
      </motion.main>
      <TriageDrawer />
      <TelemetryBar />
    </>
  );
}
