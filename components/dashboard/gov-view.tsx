"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { campTone, card, runwayHours, TONE_HEX } from "@/lib/types";
import RequestsPanel from "./requests-panel";

const tip = { background: "#0F1624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };

export default function GovView() {
  const { data } = useApp();
  if (!data) return null;
  const sd = data.camps.map((c) => ({ name: c.name.replace("Camp ", ""), supply: c.foodPackets, demand: c.burnRatePerHour * 24 }));
  const rw = data.camps.map((c) => ({ name: c.name.replace("Camp ", ""), hours: +Math.min(runwayHours(c), 48).toFixed(1), tone: campTone(c) }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-white">Food supply vs 24h demand</h2>
          <ResponsiveContainer width="100%" height={240} minWidth={0}>
            <BarChart data={sd}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="supply" name="Supply" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demand" name="Demand (24h)" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-white">Camp survival runway (hours, capped 48)</h2>
          <ResponsiveContainer width="100%" height={240} minWidth={0}>
            <BarChart data={rw}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="hours" name="Runway h" radius={[4, 4, 0, 0]}>
                {rw.map((r) => <Cell key={r.name} fill={TONE_HEX[r.tone]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      <RequestsPanel approvable />
      <section className={`${card} p-4`}>
        <h2 className="mb-3 text-sm font-semibold text-white">Global depot stock</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.depots.map((d) => (
            <motion.div whileHover={{ scale: 1.02, translateY: -2 }} key={d.id} className="rounded-xl border border-white/10 bg-[#030712] p-3">
              <p className="text-sm font-medium text-white">{d.name}</p>
              <p className="text-[10px] text-slate-500">{d.district}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {([["Food", d.foodStock], ["Water", d.waterStock], ["Medicine", d.medicineStock], ["Shelter", d.shelterStock]] as const).map(([l, v]) => (
                  <div key={l}><dt className="text-slate-500">{l}</dt><dd className="font-mono tabular-nums text-[#38BDF8]">{v}</dd></div>
                ))}
              </dl>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
