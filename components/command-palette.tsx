"use client";

import { useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";

const item =
  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 data-[selected=true]:bg-[#38BDF8]/15 data-[selected=true]:text-white";
const heading =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-500";

export default function CommandPalette() {
  const { data, paletteOpen, setPaletteOpen, setSelectedCampId, setSurvivorQuery, rebalance, flood } = useApp();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  const go = (fn: () => void) => () => {
    setPaletteOpen(false);
    fn();
  };

  return (
    <Command.Dialog
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[18vh] z-[100] w-[min(92vw,600px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0F1624] shadow-2xl shadow-black/60"
    >
      <Command.Input
        placeholder="Jump to camp, search survivor, rebalance, switch role…"
        className="w-full border-b border-white/10 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-500"
      />
      <Command.List data-lenis-prevent className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">No match.</Command.Empty>
        <Command.Group heading="Actions" className={heading}>
          <Command.Item className={item} onSelect={go(() => { router.push("/dashboard"); rebalance(); })}>
            🧠 Auto-Rebalance Surplus
          </Command.Item>
          <Command.Item className={item} onSelect={go(() => { router.push("/dashboard"); flood(); })}>
            ⚡ Simulate Flash Flood SOS
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Camps" className={heading}>
          {data?.camps.map((c) => (
            <Command.Item key={c.id} className={item} value={`camp ${c.name} ${c.district}`} onSelect={go(() => { setSelectedCampId(c.id); router.push("/dashboard"); })}>
              ⛺ {c.name}
              <span className="ml-auto text-xs text-slate-500">{c.district}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Displaced survivors" className={heading}>
          {data?.people.map((p) => (
            <Command.Item key={p.id} className={item} value={`survivor ${p.fullName} ${p.familyGroupCode}`} onSelect={go(() => { setSurvivorQuery(p.fullName); router.push("/dashboard#registry"); })}>
              🔎 {p.fullName}
              <span className="ml-auto text-xs text-slate-500">{p.familyGroupCode} · {p.currentCampName}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Navigate" className={heading}>
          <Command.Item className={item} onSelect={go(() => router.push("/"))}>Home</Command.Item>
          <Command.Item className={item} onSelect={go(() => router.push("/dashboard"))}>Command Dashboard</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
