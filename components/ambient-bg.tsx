"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/providers";
import { campTone } from "@/lib/types";

const GLOW = { CRITICAL: "rgba(239,68,68,0.22)", OVERFLOW: "rgba(245,158,11,0.20)", STABLE: "rgba(34,211,238,0.20)" } as const;

export default function AmbientBg() {
  const { data } = useApp();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const isLandingPage = pathname === "/";
  const gridY = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -96], { clamp: false });
  const scopeY = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -260], { clamp: false });
  const scopeRotate = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -7], { clamp: false });
  const scopeScale = useTransform(scrollY, [0, 2400], [1, reduceMotion ? 1 : 1.12], { clamp: false });
  const tones = (data?.camps ?? []).map(campTone);
  const tone = tones.includes("CRITICAL") ? "CRITICAL" : tones.includes("OVERFLOW") ? "OVERFLOW" : "STABLE";
  const pulse = tone === "CRITICAL" ? 3 : 7;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020408]">
      <motion.div className="space-grid absolute -inset-16" style={isLandingPage ? { y: gridY } : undefined} />
      <motion.svg className="absolute left-1/2 top-[38%] size-[1400px] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" viewBox="0 0 1400 1400" fill="none" stroke="#38BDF8" strokeWidth="1"
        style={isLandingPage ? { y: scopeY, rotate: scopeRotate, scale: scopeScale } : undefined}>
        {[200, 340, 480, 620].map((r) => <circle key={r} cx="700" cy="700" r={r} strokeDasharray={r % 480 === 0 ? "4 10" : undefined} />)}
        <line x1="700" y1="60" x2="700" y2="1340" /><line x1="60" y1="700" x2="1340" y2="700" />
      </motion.svg>
      <motion.div className="absolute left-1/2 top-[-10%] size-[900px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${GLOW[tone]}, transparent 65%)` }}
        animate={{ x: [-100, 100, -100], opacity: [0.55, 1, 0.55] }} transition={{ duration: pulse * 2.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute bottom-[-20%] right-[-10%] size-[700px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.10),transparent_65%)] blur-3xl"
        animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: pulse * 2, repeat: Infinity, ease: "easeInOut" }} />
    </div>
  );
}
