"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "#roles", label: "Roles" },
  { href: "#capabilities", label: "Capabilities" },
];

export default function LandingNav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 120], [0, 1]);
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div aria-hidden style={{ opacity: bg }} className="absolute inset-0 border-b border-white/10 bg-[#030712]/60 backdrop-blur-xl" />
      <nav aria-label="Primary" className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
          Displace<span className="text-[#F59E0B]">OS</span>
        </Link>
        <ul className="flex items-center gap-1 text-xs text-slate-300 sm:gap-4">
          {LINKS.map((l) => (
            <li key={l.href} className={l.href === "#capabilities" ? "hidden sm:block" : ""}>
              <Link href={l.href} className="rounded px-2 py-1.5 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">{l.label}</Link>
            </li>
          ))}
          <li>
            <Link href="/dashboard" className="rounded-full bg-[#F59E0B] px-3.5 py-1.5 font-semibold text-[#1a1100] transition hover:shadow-[0_0_24px_rgba(245,158,11,0.6)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Open Command
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
