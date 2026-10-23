"use client";

import { motion } from "framer-motion";
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
import FacilitiesMatrix from "@/components/dashboard/facilities-matrix";
import AccuracyShield from "@/components/dashboard/accuracy-shield";
import ReinforcementPanel from "@/components/dashboard/reinforcement-panel";
import TelemetryFeed from "@/components/dashboard/telemetry-feed";
import ImpactModal from "@/components/dashboard/impact-modal";
import MeshDrawer from "@/components/dashboard/mesh-drawer";
import WeatherPanel from "@/components/dashboard/weather-panel";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } } };

export default function DashboardPage() {
  const { role, data, sessionPending } = useApp();
  const m = data?.metrics;
  const stats: [string, number, string][] = [
    ["Critical camps", m?.criticalCamps ?? 0, "#EF4444"], ["Pending SOS", m?.pendingSOS ?? 0, "#F59E0B"],
    ["Active convoys", m?.activeConvoys ?? 0, "#38BDF8"], ["Registered survivors", m?.registeredSurvivors ?? 0, "#10B981"],
  ];
  if (!role) {
    return <main className="flex flex-1 items-center justify-center text-sm text-slate-500">{sessionPending ? "Checking session…" : "Operator authentication required"}</main>;
  }
  return (
    <>
      <Navbar />
      <motion.main variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-[1500px] flex-1 space-y-4 px-4 pb-16 pt-4">
        <motion.div variants={item} role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true"
            ? "DEMO SCENARIO · Sample operational records. No official alert, GPS, agency dispatch, or radio feeds are connected."
            : "Prototype data source · Records may be seeded or operator-entered. No official alert, GPS, agency dispatch, or radio feeds are connected."}
        </motion.div>
        <motion.div variants={item}><AlertBanner /></motion.div>
        <motion.div variants={item}><WeatherPanel /></motion.div>
        <motion.div variants={item} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([l, v, c]) => (
            <motion.div key={l} whileHover={{ scale: 1.02, translateY: -2 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
              <p className="text-3xl font-bold tabular-nums" style={{ color: c }}>{v}</p>
              <p className="text-xs text-slate-400">{l}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div variants={item}><TacticalMap /></motion.div>
        <motion.div variants={item}>
          {role === "GOV_AGENCY" && <GovView />}
          {role === "RELIEF_CAMP" && <CampView />}
          {role === "RESCUE_TEAM" && <RescueView />}
        </motion.div>
        <motion.div variants={item} className="grid gap-4 xl:grid-cols-[3fr_2fr]"><AccuracyShield /><TelemetryFeed /></motion.div>
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <motion.div variants={item}><ReinforcementPanel /></motion.div>}
        <motion.div variants={item}><FacilitiesMatrix /></motion.div>
        <motion.div variants={item}><SurvivorRegistry /></motion.div>
      </motion.main>
      <TriageDrawer />
      <ImpactModal />
      <MeshDrawer />
      <TelemetryBar />
    </>
  );
}
