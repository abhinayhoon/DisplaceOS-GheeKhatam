"use client";

import type { ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { card } from "@/lib/types";

export default function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const bg = useMotionTemplate`radial-gradient(340px circle at ${x}px ${y}px, rgba(245,158,11,0.16), transparent 70%)`;
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden ${card} ${className}`}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
