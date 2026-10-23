"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { card } from "@/lib/types";

type WeatherCamp = {
  campId: string; campName: string; district: string; time: string;
  temperature: number | null; rainMm: number | null; rainChancePct: number | null;
  windKmh: number | null; gustKmh: number | null; code: number | null;
};
type WeatherResponse = { source: string; camps: WeatherCamp[] };

const weatherText = (code: number | null) => {
  if (code == null) return "Conditions unavailable";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return `Weather code ${code}`;
};

export default function WeatherPanel() {
  const { role } = useApp();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!role) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/weather", { cache: "no-store" });
        if (!response.ok) throw new Error("Weather feed unavailable");
        const result = await response.json() as WeatherResponse;
        if (active) { setWeather(result); setUnavailable(false); }
      } catch {
        if (active) setUnavailable(true);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [role]);

  return (
    <section className={`${card} p-4`} aria-label="Weather forecast context">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Weather context</h2>
        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-200">Forecast model, not an official warning</span>
        {weather && <span className="ml-auto text-[10px] text-slate-500">Model data time shown per camp</span>}
      </div>
      <p className="mb-3 text-xs text-slate-400">Use this as additional context only. Check official alerts and local authorities before making safety or route decisions.</p>
      {weather?.camps.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {weather.camps.map((camp) => (
            <article key={camp.campId} className="rounded-xl border border-white/5 bg-[#020408]/70 p-3">
              <h3 className="text-xs font-semibold text-white">{camp.campName} <span className="font-normal text-slate-500">· {camp.district}</span></h3>
              <p className="mt-1 text-[10px] text-slate-500">Model time {new Date(camp.time).toLocaleString()}</p>
              <p className="mt-2 text-sm text-slate-200">{weatherText(camp.code)}{camp.temperature == null ? "" : ` · ${camp.temperature}°C`}</p>
              <p className="mt-1 text-[10px] text-slate-400">Rain {camp.rainMm == null ? "—" : `${camp.rainMm} mm`} now · hourly chance {camp.rainChancePct == null ? "—" : `${camp.rainChancePct}%`}</p>
              <p className="text-[10px] text-slate-400">Wind {camp.windKmh == null ? "—" : `${camp.windKmh} km/h`} · gusts {camp.gustKmh == null ? "—" : `${camp.gustKmh} km/h`}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{unavailable ? "Weather service is unavailable. No cached observation is being shown." : "Loading forecast context…"}</p>
      )}
      {unavailable && weather && <p role="status" className="mt-2 text-xs text-amber-200">Refresh failed. Values above are the last response received. Check the model time before using this context.</p>}
      <p className="mt-3 text-[10px] text-slate-500">Source: <a className="underline underline-offset-2" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>, based on numerical weather models. Forecasts may be delayed or unavailable.</p>
    </section>
  );
}
