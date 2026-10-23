"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";

const STAGES = ["DETECT", "DISPATCH", "DELIVER", "VERIFY"];

export default function LifecycleMarquee() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 400, damping: 50 });
  const skewX = useTransform(velocity, [-3000, 3000], [-10, 10], { clamp: true });
  return (
    <section aria-label="Mission lifecycle: detect, dispatch, deliver, verify" className="overflow-hidden border-y border-white/10 py-6">
      <motion.div style={{ skewX: reduce ? 0 : skewX }}>
        <motion.div
          className="flex w-max"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        >
          {[0, 1].map((k) => (
            <div key={k} aria-hidden={k === 1} className="flex shrink-0 items-center gap-10 pr-10">
              {STAGES.map((s) => (
                <span key={s} className="flex items-center gap-10">
                  <span className="text-[clamp(3rem,9vw,7.5rem)] font-black leading-none tracking-tighter text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.35)]">{s}</span>
                  <span className="size-3 rounded-full bg-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
