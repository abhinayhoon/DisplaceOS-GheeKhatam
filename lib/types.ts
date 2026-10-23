export type Camp = {
  id: string; name: string; district: string; lat: number; lng: number; capacity: number; currentOccupancy: number;
  status: string; foodPackets: number; waterLiters: number; medicalKits: number; shelterTents: number; burnRatePerHour: number;
};
export type Req = {
  id: string; campId: string; campName: string; district: string; resourceType: string; quantityNeeded: number;
  urgencyScore: number; status: string; duplicateFlag: boolean; reasoningJson: string; createdAt: string;
};
export type Depot = { id: string; name: string; district: string; foodStock: number; waterStock: number; medicineStock: number; shelterStock: number };
export type Dispatch = {
  id: string; teamName: string; unitCode: string; vehicleType: string; originName: string; targetCampId: string;
  targetCampName: string; resourceType: string; quantity: number; etaMinutes: number; routeStatus: string; progressPercent: number;
};
export type Person = {
  id: string; fullName: string; age: number; medicalNeeds: string; currentCampName: string; district: string;
  familyGroupCode: string; status: string;
};
export type LiveState = { camps: Camp[]; requests: Req[]; depots: Depot[]; dispatches: Dispatch[]; people: Person[] };

export type Role = "GOV_AGENCY" | "RELIEF_CAMP" | "RESCUE_TEAM";
export type Perm = "REBALANCE" | "APPROVE" | "SIMULATE" | "REQUEST" | "STOCK" | "REGISTER" | "DISPATCH" | "TRIAGE_STATUS";

export const ROLES: Record<Role, { label: string; short: string; badge: string; perms: Perm[] }> = {
  GOV_AGENCY: {
    label: "🏛️ Gov Agency (NDMA Command)", short: "Gov Agency", badge: "FULL COMMAND · REBALANCE · APPROVE",
    perms: ["REBALANCE", "APPROVE", "SIMULATE", "TRIAGE_STATUS"],
  },
  RELIEF_CAMP: {
    label: "⛺ Relief Camp (Camp Manager)", short: "Camp Manager", badge: "CAMP OPS · SOS REQUEST · REGISTER",
    perms: ["REQUEST", "STOCK", "REGISTER", "TRIAGE_STATUS"],
  },
  RESCUE_TEAM: {
    label: "🚁 Rescue Team (NDRF Field Unit)", short: "NDRF Field Unit", badge: "FIELD OPS · DISPATCH · DELIVER",
    perms: ["DISPATCH", "SIMULATE", "TRIAGE_STATUS"],
  },
};

export const card = "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]";

export function runwayHours(c: Camp) {
  return c.burnRatePerHour > 0 ? c.foodPackets / c.burnRatePerHour : 99;
}
export function campTone(c: Camp): "CRITICAL" | "OVERFLOW" | "STABLE" {
  if (c.status === "CRITICAL" || runwayHours(c) < 12) return "CRITICAL";
  if (c.status === "OVERFLOW") return "OVERFLOW";
  return "STABLE";
}
export const TONE_HEX = { CRITICAL: "#EF4444", OVERFLOW: "#F59E0B", STABLE: "#10B981" } as const;
