"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useApp } from "@/components/providers";
import Reveal from "./reveal";

export default function FinalCta() {
  const { setPaletteOpen } = useApp();
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16 });
  const y = useSpring(my, { stiffness: 220, damping: 16 });
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-40 text-center sm:px-6">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18),transparent_65%)] blur-3xl" />
      <Reveal className="relative">
        <h2 className="text-[clamp(2.75rem,9vw,8rem)] font-black leading-[0.95] tracking-tighter text-white">GET TO THE FIELD TODAY</h2>
        <div
          className="mx-auto mt-14 inline-block p-10"
          onMouseMove={(e) => {
            if (reduce) return;
            const r = e.currentTarget.getBoundingClientRect();
            mx.set((e.clientX - (r.left + r.width / 2)) * 0.3);
            my.set((e.clientY - (r.top + r.height / 2)) * 0.3);
          }}
          onMouseLeave={() => { mx.set(0); my.set(0); }}
        >
          <motion.div style={{ x, y }}>
            <Link href="/dashboard" className="inline-block rounded-full bg-[#F59E0B] px-10 py-5 text-base font-bold text-[#1a1100] shadow-[0_0_48px_rgba(245,158,11,0.45)] transition-shadow hover:shadow-[0_0_72px_rgba(245,158,11,0.75)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Enter Command Dashboard →
            </Link>
          </motion.div>
        </div>
        <p className="text-sm text-slate-400">
          or press{" "}
          <button type="button" onClick={() => setPaletteOpen(true)} className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">⌘K</button>{" "}
          to jump to any camp or survivor
        </p>
      </Reveal>
    </section>
  );
}
