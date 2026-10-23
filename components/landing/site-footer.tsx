"use client";

import Link from "next/link";
import { toast } from "sonner";

const COLS: { h: string; items: { l: string; href?: string }[] }[] = [
  { h: "Product", items: [{ l: "Command Dashboard", href: "/dashboard" }, { l: "Capabilities", href: "#capabilities" }, { l: "How it works", href: "#story" }] },
  { h: "Roles", items: [{ l: "NDMA Command", href: "#roles" }, { l: "Camp Manager", href: "#roles" }, { l: "Rescue Team", href: "#roles" }] },
  { h: "Resources", items: [{ l: "Mission lifecycle", href: "#top" }, { l: "Scenario: Uttarakhand" }, { l: "Demo data only" }] },
  { h: "Contact", items: [{ l: "Hackathon prototype" }, { l: "No production deployment" }] },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <p className="text-lg font-bold text-white">Displace<span className="text-[#F59E0B]">OS</span></p>
          <form className="mt-5 flex max-w-xs gap-2" onSubmit={(e) => { e.preventDefault(); toast.info("Demo only", { description: "Newsletter has no backend yet." }); e.currentTarget.reset(); }}>
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input id="footer-email" type="email" required placeholder="you@agency.gov" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#F59E0B]" />
            <button type="submit" className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#1a1100] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Notify me</button>
          </form>
        </div>
        {COLS.map((c) => (
          <nav key={c.h} aria-label={c.h}>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">{c.h}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
              {c.items.map((it) => (
                <li key={it.l}>{it.href ? <Link href={it.href} className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">{it.l}</Link> : <span className="text-slate-500">{it.l}</span>}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-14 max-w-6xl text-[11px] text-slate-600">© DisplaceOS. Scenario figures are illustrative estimates, not measured benchmarks.</p>
    </footer>
  );
}
