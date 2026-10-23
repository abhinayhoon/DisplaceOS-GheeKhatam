"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import StepReportPanel from "./step-report-panel";
import StepRespondPanel from "./step-respond-panel";

function useIsDesktop() {
  const [d, setD] = useState<boolean | null>(null);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const f = () => setD(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return d;
}

const outlined = "text-transparent [-webkit-text-stroke:1.5px_rgba(245,158,11,0.8)]";

function Numeral({ n, word, body }: { n: string; word: string; body: string }) {
  return (
    <div>
      <p className={`text-[clamp(5rem,13vw,11rem)] font-black leading-none tracking-tighter ${outlined}`}>{n}</p>
      <h3 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">{word}</h3>
      <p className="mt-3 max-w-sm text-slate-400">{body}</p>
    </div>
  );
}

function Pinned() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const s1 = useTransform(p, [0.4, 0.52], [1, 0]);
  const s2 = useTransform(p, [0.48, 0.6], [0, 1]);
  const s1y = useTransform(p, [0.4, 0.52], [0, reduce ? 0 : -40]);
  const s2y = useTransform(p, [0.48, 0.6], [reduce ? 0 : 40, 0]);
  const p1 = useTransform(p, [0.02, 0.44], [0, 1]);
  const p2 = useTransform(p, [0.5, 0.95], [0, 1]);
  const cue = useTransform(p, [0.85, 0.97], [1, 0]);
  return (
    <section id="story" ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center px-6">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Your response in two steps</p>
            <div className="relative h-[320px]">
              <motion.div style={{ opacity: s1, y: s1y }} className="absolute inset-0"><Numeral n="01" word="Define" body="Camps and rescue teams log what is needed, where, and how fast it runs out." /></motion.div>
              <motion.div style={{ opacity: s2, y: s2y }} className="absolute inset-0"><Numeral n="02" word="Receive" body="Operators review suggested transfers, record dispatch progress, and confirm deliveries before stock is credited." /></motion.div>
            </div>
          </div>
          <div className="relative h-[540px]">
            <motion.div style={{ opacity: s1 }} className="absolute inset-0"><StepReportPanel p={p1} /></motion.div>
            <motion.div style={{ opacity: s2 }} className="pointer-events-none absolute inset-0"><StepRespondPanel p={p2} /></motion.div>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl items-center justify-between border-t border-white/10 pt-5 text-sm">
          <span className="text-slate-400">Actual response time depends on field data, connectivity, and operator action.</span>
          <motion.span style={{ opacity: cue }} className="flex items-center gap-2 text-xs text-slate-500">
            Scroll to continue <motion.span aria-hidden animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>↓</motion.span>
          </motion.span>
        </div>
      </div>
    </section>
  );
}

function MobileStep({ n, word, body, Panel }: { n: string; word: string; body: string; Panel: typeof StepReportPanel }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  return (
    <div ref={ref} className="px-4 py-12">
      <Numeral n={n} word={word} body={body} />
      <div className="mt-8 min-h-[480px]"><Panel p={scrollYProgress as MotionValue<number>} /></div>
    </div>
  );
}

export default function TwoSteps() {
  const desktop = useIsDesktop();
  if (desktop === null) return <section id="story" className="min-h-screen" />;
  if (desktop) return <Pinned />;
  return (
    <section id="story">
      <p className="px-4 pt-16 font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Your response in two steps</p>
      <MobileStep n="01" word="Define" body="Camps and rescue teams log what is needed, where, and how fast it runs out." Panel={StepReportPanel} />
      <MobileStep n="02" word="Receive" body="Operators review suggested transfers, record dispatch progress, and confirm deliveries before stock is credited." Panel={StepRespondPanel} />
      <p className="px-4 pb-8 text-sm text-slate-400">Actual response time depends on field data, connectivity, and operator action.</p>
    </section>
  );
}
