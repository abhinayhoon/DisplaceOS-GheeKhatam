"use client";

import { motion } from "framer-motion";

export default function AmbientBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#030712]">
      <motion.div
        className="absolute left-1/2 top-[-10%] size-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_65%)] blur-3xl"
        animate={{ x: [-120, 120, -120], y: [0, 60, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-[5%] size-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.20),transparent_65%)] blur-3xl"
        animate={{ x: [140, -140, 140], y: [40, -20, 40], opacity: [1, 0.55, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
