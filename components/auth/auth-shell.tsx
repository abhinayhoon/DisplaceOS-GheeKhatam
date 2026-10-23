import Link from "next/link";
import type { ReactNode } from "react";
import { card } from "@/lib/types";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="relative z-10 flex min-h-screen flex-1 items-center justify-center px-4 py-16">
      <div className={`${card} w-full max-w-md p-8`}>
        <Link href="/" className="text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B]">
          Displace<span className="text-[#F59E0B]">OS</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
