import type { Camp } from "@/lib/types";

export type Facilities = {
  power: { source: string; pct: number; backupHours: number };
  wash: { bioToilets: number; hygieneKits: number; contamination: "LOW" | "MEDIUM" | "HIGH" };
  filtration: { type: string; capacityLph: number; pct: number };
  medical: { icuBeds: number; traumaBeds: number; coldChainPct: number; oxygenCylinders: number };
  comms: { link: string; signalPct: number };
  repairRequested: string[];
};
export const FACILITY_KEYS = ["power", "wash", "filtration", "medical", "comms"] as const;
export type FacilityKey = (typeof FACILITY_KEYS)[number];

export const DEFAULT_FACILITIES: Facilities = {
  power: { source: "Solar", pct: 80, backupHours: 24 },
  wash: { bioToilets: 12, hygieneKits: 100, contamination: "LOW" },
  filtration: { type: "RO", capacityLph: 800, pct: 80 },
  medical: { icuBeds: 2, traumaBeds: 4, coldChainPct: 80, oxygenCylinders: 10 },
  comms: { link: "VHF Radio", signalPct: 75 },
  repairRequested: [],
};

export function parseFacilities(c: Pick<Camp, "facilitiesJson">): Facilities {
  try {
    const j = JSON.parse(c.facilitiesJson || "{}");
    return {
      power: { ...DEFAULT_FACILITIES.power, ...j.power }, wash: { ...DEFAULT_FACILITIES.wash, ...j.wash },
      filtration: { ...DEFAULT_FACILITIES.filtration, ...j.filtration }, medical: { ...DEFAULT_FACILITIES.medical, ...j.medical },
      comms: { ...DEFAULT_FACILITIES.comms, ...j.comms }, repairRequested: Array.isArray(j.repairRequested) ? j.repairRequested : [],
    };
  } catch {
    return DEFAULT_FACILITIES;
  }
}

/** 0-100 health per facility. */
export function health(f: Facilities): Record<FacilityKey, number> {
  return {
    power: Math.round(f.power.pct * 0.7 + Math.min(f.power.backupHours, 24) / 24 * 30),
    wash: f.wash.contamination === "LOW" ? 90 : f.wash.contamination === "MEDIUM" ? 55 : 20,
    filtration: f.filtration.pct,
    medical: Math.round(f.medical.coldChainPct * 0.6 + Math.min(f.medical.oxygenCylinders, 10) * 4),
    comms: f.comms.signalPct,
  };
}
/** 0 (all healthy) .. 1 (all failed). */
export function facilityDeficit(f: Facilities) {
  const h = Object.values(health(f));
  return +(1 - h.reduce((a, b) => a + b, 0) / h.length / 100).toFixed(3);
}
