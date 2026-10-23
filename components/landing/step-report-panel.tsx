"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import SpotlightCard from "./spotlight-card";

const CHIPS = ["Food", "Water", "Medicine", "Shelter", "Rescue"];
const CARDS = [
  ["Request triage & urgency scoring", "Occupancy × Deficit ÷ Survival Runway Hours ranks every SOS."],
  ["Duplicate delivery detection", "Overlapping shipments are flagged before trucks roll."],
  ["Cross-district visibility", "One live picture across all four districts."],
];

function Chip({ label, p, i }: { label: string; p: MotionValue<number>; i: number }) {
  const s = i * 0.07;
  const backgroundColor = useTransform(p, [s, s + 0.08], ["rgba(255,255,255,0.03)", "rgba(245,158,11,0.22)"]);
  const borderColor = useTransform(p, [s, s + 0.08], ["rgba(255,255,255,0.1)", "rgba(245,158,11,0.7)"]);
  const color = useTransform(p, [s, s + 0.08], ["#94a3b8", "#FBBF24"]);
  return <motion.span style={{ backgroundColor, borderColor, color }} className="rounded-full border px-3.5 py-1.5 text-xs font-semibold">{label}</motion.span>;
}

function StackCard({ title, body, p, i }: { title: string; body: string; p: MotionValue<number>; i: number }) {
  const a = 0.4 + i * 0.16;
  const opacity = useTransform(p, [a, a + 0.14], [0, 1]);
  const y = useTransform(p, [a, a + 0.14], [28, 0]);
  return (
    <motion.div style={{ opacity, y }} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{body}</p>
    </motion.div>
  );
}

export default function StepReportPanel({ p }: { p: MotionValue<number> }) {
  return (
    <SpotlightCard className="h-full p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F59E0B]">Step 01 · Report</p>
      <p className="mt-2 text-sm text-slate-400">Camps and rescue teams log needs.</p>
      <div className="mt-5 flex flex-wrap gap-2">{CHIPS.map((c, i) => <Chip key={c} label={c} p={p} i={i} />)}</div>
      <div className="mt-6 space-y-3">{CARDS.map(([t, b], i) => <StackCard key={t} title={t} body={b} p={p} i={i} />)}</div>
    </SpotlightCard>
  );
}
