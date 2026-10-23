import type { LiveState, OperatorUser, Person, Req } from "@/lib/types";

export const OUTBOX_KEY = "displaceos_offline_outbox";
export const MODE_KEY = "displaceos_offline_mode";

export type Packet = {
  id: string; action: string; payload: Record<string, unknown>; queuedAt: string; bytes: number; badgeId: string;
};

/** Actions field units may perform with the cloud severed; command actions need the uplink. */
export const QUEUEABLE = new Set([
  "CREATE_REQUEST", "REGISTER_SURVIVOR", "UPDATE_CAMP_STOCK", "UPDATE_SURVIVOR_STATUS", "UPDATE_DISPATCH_STATUS",
]);

/** Mesh hop chosen by payload size: VHF carries tiny frames, LoRa mid-size, local LAN anything else. */
export function hopFor(bytes: number): "VHF" | "LoRa" | "Local-LAN" {
  return bytes <= 128 ? "VHF" : bytes <= 255 ? "LoRa" : "Local-LAN";
}

export function makePacket(action: string, payload: Record<string, unknown>, u: OperatorUser): Packet {
  const body = JSON.stringify({ action, payload });
  return {
    id: `pkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    action, payload, queuedAt: new Date().toISOString(), bytes: new TextEncoder().encode(body).length, badgeId: u.badgeId,
  };
}

export function readOutbox(): Packet[] {
  try {
    const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function writeOutbox(p: Packet[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}

/** Optimistic local projection of a queued packet so the UI updates before sync. */
export function applyLocal(s: LiveState, pk: Packet, u: OperatorUser): LiveState {
  const p = pk.payload as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const camp = s.camps.find((c) => c.name === u.campName);
  switch (pk.action) {
    case "CREATE_REQUEST": {
      if (!camp) return s;
      const type = String(p.resourceType), qty = Number(p.quantityNeeded) || 1;
      const field = ({ FOOD: "foodPackets", WATER: "waterLiters", MEDICINE: "medicalKits", SHELTER: "shelterTents" } as const)[type as "FOOD"];
      const stock = field ? camp[field] : 0;
      const deficit = Math.max(0, qty - stock);
      const runway = field && camp.burnRatePerHour > 0 ? Math.max(0.5, stock / camp.burnRatePerHour) : 1;
      const r: Req = {
        id: pk.id, campId: camp.id, campName: camp.name, district: camp.district, resourceType: type, quantityNeeded: qty,
        urgencyScore: Math.round((camp.currentOccupancy * deficit) / Math.max(runway, 0.5)), status: "OFFLINE_QUEUED",
        duplicateFlag: false, createdAt: pk.queuedAt,
        reasoningJson: JSON.stringify({ occupancy: camp.currentOccupancy, deficit, runwayHours: +runway.toFixed(2), formula: "(occupancy x deficit) / runwayHours", note: "Queued offline - mesh packet ready" }),
      };
      return { ...s, requests: [r, ...s.requests] };
    }
    case "REGISTER_SURVIVOR": {
      if (!camp) return s;
      const person: Person = {
        id: pk.id, fullName: String(p.fullName), age: Number(p.age) || 0, medicalNeeds: String(p.medicalNeeds || "None"),
        currentCampName: camp.name, district: camp.district, familyGroupCode: String(p.familyGroupCode || "FAM-NEW").toUpperCase(),
        status: "SAFE_IN_CAMP", offline: true,
      };
      return { ...s, survivors: [...s.survivors, person], metrics: { ...s.metrics, registeredSurvivors: s.metrics.registeredSurvivors + 1 } };
    }
    case "UPDATE_CAMP_STOCK":
      return camp
        ? { ...s, camps: s.camps.map((c) => (c.id === camp.id ? { ...c, [p.field]: Math.max(0, (c as any)[p.field] + Number(p.delta)) } : c)) } // eslint-disable-line @typescript-eslint/no-explicit-any
        : s;
    case "UPDATE_SURVIVOR_STATUS":
      return { ...s, survivors: s.survivors.map((x) => (x.id === p.id ? { ...x, status: String(p.status), offline: true } : x)) };
    case "UPDATE_DISPATCH_STATUS":
      return {
        ...s,
        dispatches: s.dispatches.map((d) => {
          if (d.id !== p.id) return d;
          if (p.status === "PROGRESS_25") return { ...d, progressPercent: Math.min(99, d.progressPercent + 25) };
          return { ...d, routeStatus: String(p.status) };
        }),
      };
    default:
      return s;
  }
}
