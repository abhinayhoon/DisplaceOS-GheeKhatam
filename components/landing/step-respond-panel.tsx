"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import SpotlightCard from "./spotlight-card";

type Pt = [number, number];
const quad = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

function Route({ p, from, ctrl, to, r0, r1 }: { p: MotionValue<number>; from: Pt; ctrl: Pt; to: Pt; r0: number; r1: number }) {
  const pathLength = useTransform(p, [r0, r1], [0, 1]);
  const dotOpacity = useTransform(p, [r0, r0 + 0.04, r1 + 0.1, r1 + 0.16], [0, 1, 1, 0]);
  const t = useTransform(p, [r0 + 0.04, r1 + 0.12], [0, 1], { clamp: true });
  const cx = useTransform(t, (v) => quad(from[0], ctrl[0], to[0], v));
  const cy = useTransform(t, (v) => quad(from[1], ctrl[1], to[1], v));
  return (
    <g>
      <motion.path d={`M${from[0]} ${from[1]} Q${ctrl[0]} ${ctrl[1]} ${to[0]} ${to[1]}`} fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" style={{ pathLength }} />
      <motion.circle r={5} fill="#FBBF24" style={{ cx, cy, opacity: dotOpacity }} />
    </g>
  );
}

function Node({ p, x, y, label, flip }: { p: MotionValue<number>; x: number; y: number; label: string; flip?: [number, number] }) {
  const fill = useTransform(p, flip ?? [0, 1], flip ? ["#EF4444", "#10B981"] : ["#10B981", "#10B981"]);
  const pulse = useTransform(p, flip ?? [0, 1], flip ? [1, 0] : [0, 0]);
  return (
    <g>
      <motion.g style={{ opacity: pulse }}>
        <motion.circle cx={x} cy={y} fill="#EF4444" initial={{ r: 8, opacity: 0.5 }} animate={{ r: 24, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} />
      </motion.g>
      <motion.circle cx={x} cy={y} r={9} style={{ fill }} stroke="#020408" strokeWidth={2.5} />
      <text x={x} y={y - 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="#e2e8f0">{label}</text>
    </g>
  );
}

const CAPS = ["Propose resource transfers and track dispatch records", "Review recorded stock and burn-rate estimates", "Record survivor and family-group details"];

function Cap({ text, p, i }: { text: string; p: MotionValue<number>; i: number }) {
  const a = 0.55 + i * 0.12;
  const opacity = useTransform(p, [a, a + 0.12], [0, 1]);
  const x = useTransform(p, [a, a + 0.12], [-16, 0]);
  return <motion.li style={{ opacity, x }} className="flex items-center gap-2 text-sm text-slate-200"><span className="size-1.5 rounded-full bg-[#10B981]" />{text}</motion.li>;
}

export default function StepRespondPanel({ p }: { p: MotionValue<number> }) {
  const gridY = useTransform(p, [0, 1], [18, -18]);
  return (
    <SpotlightCard className="h-full p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F59E0B]">Step 02 · Respond</p>
      <div className="relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#020408]/70">
        <motion.svg viewBox="0 0 400 260" role="img" aria-label="Reroute lines from Camp Alpha and Chamoli Depot to Camp Delta and Camp Gamma" className="block w-full">
          <motion.g style={{ y: gridY }}>
            {Array.from({ length: 11 }).map((_, i) => <line key={`v${i}`} x1={i * 40} y1={-20} x2={i * 40} y2={300} stroke="rgba(255,255,255,0.05)" />)}
            {Array.from({ length: 9 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 36 - 10} x2={400} y2={i * 36 - 10} stroke="rgba(255,255,255,0.05)" />)}
          </motion.g>
          <Route p={p} from={[70, 70]} ctrl={[200, 10]} to={[330, 80]} r0={0.1} r1={0.4} />
          <Route p={p} from={[340, 210]} ctrl={[260, 150]} to={[190, 190]} r0={0.2} r1={0.5} />
          <Node p={p} x={70} y={70} label="Alpha · surplus" />
          <Node p={p} x={340} y={210} label="Chamoli Depot" />
          <Node p={p} x={330} y={80} label="Delta" flip={[0.45, 0.55]} />
          <Node p={p} x={190} y={190} label="Gamma" flip={[0.5, 0.6]} />
        </motion.svg>
      </div>
      <ul className="mt-5 space-y-2.5">{CAPS.map((c, i) => <Cap key={c} text={c} p={p} i={i} />)}</ul>
    </SpotlightCard>
  );
}
