"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

const CHALLENGE = "Relief is fragmented, duplicated, and blind across districts.".split(" ");
const SOLUTION = "A shared workflow for recording needs, stock, and dispatch outcomes.".split(" ");

function Word({ word, p, a, b, bright }: { word: string; p: MotionValue<number>; a: number; b: number; bright: boolean }) {
  const opacity = useTransform(p, [a, b], [0.12, 1]);
  const blur = useTransform(p, [a, b], ["blur(6px)", "blur(0px)"]);
  return (
    <motion.span style={{ opacity, filter: blur }} className={`mr-[0.25em] inline-block ${bright ? "text-white" : "text-slate-300"}`}>
      {word}
    </motion.span>
  );
}

export default function ChallengeSolution() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.55"] });
  const total = CHALLENGE.length + SOLUTION.length;
  const block = (words: string[], offset: number, label: string, tone: string, bright: boolean) => (
    <div>
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: tone }}>{label}</p>
      <p className="text-[clamp(2rem,5.6vw,4.75rem)] font-bold leading-[1.05] tracking-tight">
        {words.map((w, i) => {
          const a = ((offset + i) / total) * 0.85;
          return <Word key={`${label}-${i}`} word={w} p={scrollYProgress} a={a} b={a + 0.1} bright={bright} />;
        })}
      </p>
    </div>
  );
  return (
    <section ref={ref} className="mx-auto flex min-h-[150vh] max-w-6xl flex-col justify-center gap-28 px-4 py-32 sm:px-6">
      {block(CHALLENGE, 0, "The Challenge", "#EF4444", false)}
      {block(SOLUTION, CHALLENGE.length, "The Solution", "#10B981", true)}
    </section>
  );
}
