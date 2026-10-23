"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { EASE } from "@/lib/motion";
import { useApp } from "@/components/providers";

const WORDS = ["DISASTER", "RELIEF", "MADE", "SIMPLE"];

export default function Hero() {
  const { openLogin, user } = useApp();
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 220]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -140]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-24 pt-24 text-center">
      <motion.div aria-hidden style={{ y: y1 }} className="pointer-events-none absolute left-[10%] top-[15%] size-[520px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.28),transparent_65%)] blur-3xl" />
      <motion.div aria-hidden style={{ y: y2 }} className="pointer-events-none absolute bottom-[5%] right-[8%] size-[460px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_65%)] blur-3xl" />
      <motion.div style={{ opacity: fade }} className="relative z-10 mx-auto max-w-6xl">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]"
        >
          A shared workspace for relief coordination
        </motion.p>
        <h1 className="text-[clamp(2.75rem,10.5vw,9.5rem)] font-black leading-[0.92] tracking-tighter text-white">
          {WORDS.map((w, i) => (
            <span key={w} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom last:mr-0">
              <motion.span
                className="inline-block bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
                initial={reduce ? false : { y: "110%" }} animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.15 + i * 0.1 }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
          className="mx-auto mt-8 max-w-xl text-pretty text-base text-slate-400 sm:text-lg"
        >
          DisplaceOS is a prototype for recording camp needs, available stock, dispatches, and survivor records. Its current scenario uses sample data and has no connected field feeds.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.95 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button type="button" onClick={() => user ? router.push("/dashboard") : openLogin(null)} className="rounded-full bg-[#F59E0B] px-8 py-3.5 text-sm font-bold text-[#1a1100] shadow-[0_0_32px_rgba(245,158,11,0.4)] transition hover:shadow-[0_0_48px_rgba(245,158,11,0.7)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            Enter Command Dashboard →
          </button>
          <Link href="#story" className="rounded-full border border-white/15 px-8 py-3.5 text-sm text-slate-300 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
            See how it works
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
