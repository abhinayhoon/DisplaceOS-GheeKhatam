import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { serviceFailureMessage, serviceFailureStatus } from "@/lib/service-errors";

type WeatherPoint = {
  time: string;
  temperature: number | null;
  rainMm: number | null;
  rainChancePct: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  code: number | null;
};

const numberOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

export async function GET() {
  await connection();
  try {
    await requireUser();
    const camps = await prisma.reliefCamp.findMany({
      select: { id: true, name: true, district: true, lat: true, lng: true },
      orderBy: { name: "asc" },
      take: 50,
    });
    if (camps.length === 0) return NextResponse.json({ source: "Open-Meteo forecast model", camps: [] });

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", camps.map((camp) => camp.lat).join(","));
    url.searchParams.set("longitude", camps.map((camp) => camp.lng).join(","));
    url.searchParams.set("current", "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code");
    url.searchParams.set("hourly", "precipitation_probability");
    url.searchParams.set("forecast_hours", "6");
    url.searchParams.set("timezone", "Asia/Kolkata");

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      console.error("Weather provider returned an error", response.status);
      return NextResponse.json({ error: "Weather provider unavailable" }, { status: 502 });
    }
    const raw: unknown = await response.json();
    const entries = Array.isArray(raw) ? raw : [raw];
    if (entries.length !== camps.length) return NextResponse.json({ error: "Weather provider returned an unexpected location count" }, { status: 502 });

    const results = camps.map((camp, index) => {
      const entry = entries[index] && typeof entries[index] === "object" ? entries[index] as Record<string, unknown> : {};
      const current = entry.current && typeof entry.current === "object" ? entry.current as Record<string, unknown> : {};
      const hourly = entry.hourly && typeof entry.hourly === "object" ? entry.hourly as Record<string, unknown> : {};
      const probabilities = Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability : [];
      const point: WeatherPoint = {
        time: typeof current.time === "string" ? current.time : new Date().toISOString(),
        temperature: numberOrNull(current.temperature_2m),
        rainMm: numberOrNull(current.precipitation),
        rainChancePct: numberOrNull(probabilities[0]),
        windKmh: numberOrNull(current.wind_speed_10m),
        gustKmh: numberOrNull(current.wind_gusts_10m),
        code: numberOrNull(current.weather_code),
      };
      return { campId: camp.id, campName: camp.name, district: camp.district, ...point };
    });

    return NextResponse.json({ source: "Open-Meteo forecast model", camps: results }, {
      headers: { "cache-control": "private, max-age=300, stale-while-revalidate=300" },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Weather request failed", error);
    const message = serviceFailureMessage(error, "Weather provider unavailable");
    return NextResponse.json({ error: message }, { status: message === "Weather provider unavailable" ? 502 : serviceFailureStatus(error) });
  }
}
