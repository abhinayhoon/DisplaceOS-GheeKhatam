"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApp } from "@/components/providers";
import { authClient } from "@/lib/auth-client";
import { ROLES } from "@/lib/types";

export default function Navbar() {
  const { role, user, can, rebalance, flood, busy, setPaletteOpen } = useApp();
  const router = useRouter();
  const logout = async () => {
    await authClient.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-2 text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
          Displace<span className="text-[#EF4444]">OS</span>
        </Link>
        {role && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs">
            <span className="font-medium text-white">{user?.name}</span>
            <span className="text-slate-400">{ROLES[role].label}</span>
          </div>
        )}
        {role && <span className="rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#10B981]">{ROLES[role].badge}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setPaletteOpen(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
            ⌘K
          </motion.button>
          {can("REBALANCE") && (
            <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={rebalance}
              className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-[#04120C] transition hover:bg-[#34d399] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              🧠 1-Click Auto-Rebalance Surplus
            </motion.button>
          )}
          {can("SIMULATE") && (
            <motion.button whileTap={{ scale: 0.98 }} type="button" disabled={busy} onClick={flood}
              className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              ⚡ Simulate Flash Flood SOS
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={logout} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38BDF8]">
            Log out
          </motion.button>
        </div>
      </div>
    </header>
  );
}
