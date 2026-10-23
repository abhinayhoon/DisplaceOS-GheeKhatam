"use client";

import Reveal from "./reveal";

const FEATURES = [
  ["Request records", "Submit and review camp requests with an urgency heuristic."],
  ["Dispatch records", "Create dispatches, record route updates, and confirm delivery."],
  ["Device-local queue", "Queue selected actions in this browser for later server sync; no radio relay is provided."],
];

export default function Comparison() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-32 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Prototype scope</p>
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-white">A shared workflow for relief coordination.</h2>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-400">This demo shows how operators could work from shared records. Response-time improvements and incident outcomes have not been measured in field deployments.</p>
      </Reveal>
      <Reveal className="mt-10 grid gap-4 md:grid-cols-3" delay={0.1}>
        {FEATURES.map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
