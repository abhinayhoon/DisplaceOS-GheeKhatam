"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import CountUp from "./count-up";
import Reveal from "./reveal";

function Bar({ label, value, scale, color, duration, go }: { label: string; value: string; scale: number; color: string; duration: number; go: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between"><span className="text-sm text-slate-300">{label}</span><span className="font-mono text-lg font-bold text-white">{value}</span></div>
      <div className="h-5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div className="h-full origin-left rounded-full" style={{ background: color, width: "100%" }} initial={{ scaleX: reduce ? scale : 0 }} animate={{ scaleX: go ? scale : reduce ? scale : 0 }} transition={{ duration, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </div>
  );
}

export default function Comparison() {
  const ref = useRef<HTMLDivElement>(null);
  const go = useInView(ref, { once: true, margin: "-120px" });
  return (
    <section className="mx-auto max-w-6xl px-4 py-32 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Time to coordinate</p>
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-white">Spreadsheets lose the first 72 hours. DisplaceOS loses none.</h2>
      </Reveal>
      <div ref={ref} className="mt-14 grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <Bar label="Spreadsheet coordination" value="~72h" scale={1} color="linear-gradient(90deg,#EF4444,#F59E0B)" duration={2.6} go={go} />
          <Bar label="DisplaceOS" value="<1s" scale={0.012} color="#10B981" duration={0.5} go={go} />
        </div>
        <div>
          <p className="text-[clamp(4rem,12vw,9rem)] font-black leading-none tracking-tighter text-[#F59E0B]">−<CountUp to={72} suffix="h" duration={2.4} /></p>
          <p className="mt-3 text-sm text-slate-400">saved per coordination cycle</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Scenario estimate · not a measured benchmark</p>
        </div>
      </div>
    </section>
  );
}
