"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { OPERATORS } from "@/lib/types";
import { EASE } from "@/lib/motion";
import SpotlightCard from "./spotlight-card";
import Reveal from "./reveal";

const TABS: { key: string; label: string; bullets: string[]; preview: ReactNode }[] = [
  {
    key: "gov", label: "NDMA Command",
    bullets: ["Review requests and create transfer dispatch records", "Compare recorded supply with burn-rate estimates", "Review depot stock and suggested transfers"],
    preview: (
      <div className="space-y-3">
        <Row l="Camp Delta · Chamoli" r="Runway 0.0h" c="#EF4444" tag="CRITICAL" />
        <Row l="Camp Alpha · Uttarkashi" r="Food 5280 / 410 people" c="#F59E0B" tag="OVERFLOW" />
        <Row l="Camp Gamma · Rudraprayag" r="Medical kits 0" c="#EF4444" tag="CRITICAL" />
        <div className="rounded-lg bg-[#10B981] py-2.5 text-center text-xs font-bold text-[#04120C]">🧠 Create Suggested Transfers</div>
      </div>
    ),
  },
  {
    key: "camp", label: "Camp Manager",
    bullets: ["Submit requests for food, water, medicine, shelter, and evacuation", "Record camp stock adjustments", "Register displaced persons with family group codes"],
    preview: (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{["FOOD", "WATER", "MEDICINE", "SHELTER", "EVACUATION"].map((c, i) => <span key={c} className={`rounded-full border px-3 py-1 text-[11px] ${i === 2 ? "border-[#F59E0B]/70 bg-[#F59E0B]/20 text-[#FBBF24]" : "border-white/10 text-slate-400"}`}>{c}</span>)}</div>
        <Row l="Quantity needed" r="300" c="#38BDF8" tag="SOS" />
        <Row l="Camp Gamma stock" r="Medical kits 0" c="#EF4444" tag="LOW" />
        <div className="rounded-lg bg-[#EF4444] py-2.5 text-center text-xs font-bold text-white">Send SOS</div>
      </div>
    ),
  },
  {
    key: "rescue", label: "Rescue Team",
    bullets: ["Review dispatch records and operator-entered ETAs", "Record a route change reported by the field", "Confirm delivery before receiving stock is credited"],
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs"><span className="font-mono font-semibold text-white">HELI-02</span><span className="text-[#10B981]">CLEAR</span></div>
        <p className="text-sm text-slate-300">Dehradun Central Depot → <b>Camp Delta</b></p>
        <p className="text-xs text-slate-400">600 × FOOD · ETA 70 min</p>
        <div className="h-1.5 rounded-full bg-white/10"><div className="h-full w-1/4 rounded-full bg-[#10B981]" /></div>
        <div className="flex gap-2 text-[11px] font-semibold"><span className="flex-1 rounded-lg border border-[#F59E0B]/40 py-2 text-center text-[#F59E0B]">LANDSLIDE_DETOUR</span><span className="flex-1 rounded-lg bg-[#10B981] py-2 text-center text-[#04120C]">DELIVERED</span></div>
      </div>
    ),
  },
];

function Row({ l, r, c, tag }: { l: string; r: string; c: string; tag: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-200">{l}</span>
      <span className="flex items-center gap-2 text-slate-400">{r}<span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: c, background: `${c}22` }}>{tag}</span></span>
    </div>
  );
}

export default function RoleTabs() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);
  const { login, openLogin } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!inView || manual) return;
    const t = setInterval(() => setI((v) => (v + 1) % TABS.length), 5000);
    return () => clearInterval(t);
  }, [inView, manual]);
  const tab = TABS[i];
  return (
    <section id="roles" ref={ref} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-32 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Three roles, shared records</p>
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-white">The right controls for whoever is on the ground.</h2>
      </Reveal>
      <div role="tablist" aria-label="Stakeholder roles" className="mt-10 inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl">
        {TABS.map((t, idx) => (
          <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={i === idx} aria-controls={`panel-${t.key}`}
            onClick={() => { setManual(true); setI(idx); }}
            className="relative rounded-full px-4 py-2 text-xs font-medium text-slate-400 transition aria-selected:text-[#1a1100] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B] sm:text-sm">
            {i === idx && <motion.span layoutId="landing-role-pill" transition={{ duration: 0.6, ease: EASE }} className="absolute inset-0 rounded-full bg-[#F59E0B]" />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab.key}`} aria-labelledby={`tab-${tab.key}`} className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <AnimatePresence mode="wait">
          <motion.div key={tab.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: EASE }} className="contents">
            <SpotlightCard className="min-h-[320px] p-6">
              <div className="mb-5 flex gap-1.5" aria-hidden><i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" /><i className="size-2.5 rounded-full bg-white/20" /></div>
              {tab.preview}
              <p className="mt-5 text-[10px] uppercase tracking-widest text-slate-500">Demo scenario · seeded data</p>
            </SpotlightCard>
            <ul className="flex flex-col justify-center gap-6">
              {tab.bullets.map((b, k) => (
                <motion.li key={b} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.1 + k * 0.1 }} className="flex gap-4 border-b border-white/10 pb-6 text-lg text-slate-200 last:border-0">
                  <span className="font-mono text-sm text-[#F59E0B]">0{k + 1}</span>{b}
                </motion.li>
              ))}
              <li>
                <button type="button" onClick={async () => {
                  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
                    if (await login(OPERATORS[i].badgeId)) router.push("/dashboard");
                  } else {
                    openLogin(((["GOV_AGENCY", "RELIEF_CAMP", "RESCUE_TEAM"] as const)[i]));
                  }
                }}
                  className="rounded-full bg-[#F59E0B] px-6 py-2.5 text-sm font-bold text-[#1a1100] transition hover:shadow-[0_0_24px_rgba(245,158,11,0.6)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  {process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? `Enter as ${tab.label}` : `Sign in as ${tab.label}`} →
                </button>
              </li>
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
