"use client";

import { useApp } from "@/components/providers";
import CountUp from "./count-up";
import Reveal from "./reveal";

export default function Capabilities() {
  const { data } = useApp();
  const cells = [
    { n: <CountUp to={data?.camps.length ?? 6} />, l: "camp records", note: "Sample or operator-entered" },
    { n: <CountUp to={3} />, l: "role-based views", note: "Government · Camp · Rescue" },
    { n: <span className="tabular-nums">3s</span>, l: "server refresh", note: "Visible tabs only · polling" },
    { n: <CountUp to={1} />, l: "weather model feed", note: "Forecast context · not an official warning" },
  ];
  return (
    <section id="capabilities" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-32 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F59E0B]">Prototype capabilities</p>
      </Reveal>
      <Reveal className="mt-10 grid border-y border-white/10 lg:grid-cols-4" delay={0.1}>
        {cells.map((c, i) => (
          <div key={c.l} className={`px-2 py-12 lg:px-8 ${i > 0 ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}>
            <div className="text-[clamp(3.5rem,8vw,6.5rem)] font-black leading-none tracking-tighter text-white">{c.n}</div>
            <p className="mt-4 text-base text-slate-300">{c.l}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{c.note}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
