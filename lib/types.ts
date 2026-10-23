export type Camp = {
  id: string; name: string; district: string; lat: number; lng: number; capacity: number; currentOccupancy: number;
  status: string; foodPackets: number; waterLiters: number; medicalKits: number; shelterTents: number; burnRatePerHour: number;
  facilitiesJson: string; verificationJson: string;
};
export type Req = {
  id: string; campId: string; campName: string; district: string; resourceType: string; quantityNeeded: number;
  urgencyScore: number; status: string; duplicateFlag: boolean; reasoningJson: string; createdAt: string;
};
export type Depot = { id: string; name: string; district: string; foodStock: number; waterStock: number; medicineStock: number; shelterStock: number };
export type Dispatch = {
  id: string; teamName: string; unitCode: string; vehicleType: string; originName: string; targetCampId: string;
  targetCampName: string; resourceType: string; quantity: number; etaMinutes: number; routeStatus: string; progressPercent: number;
  stockApplied?: boolean;
};
export type Person = {
  id: string; fullName: string; age: number; medicalNeeds: string; currentCampName: string; district: string;
  familyGroupCode: string; status: string; offline?: boolean;
};
export type Metrics = {
  criticalCamps: number; pendingSOS: number; activeConvoys: number; registeredSurvivors: number;
  activeDuplicates: number; minRunwayHours: number; needsMedevac: number; avgConfidence: number; anomalies: number;
};
export type Weights = { routeReliability: number; burnDrift: number; facilityPenalty: number; history: { at: string; trigger: string; weights: string }[] };
export type TelemetryEvt = { id: string; kind: string; message: string; createdAt: string };
export type VerifLog = { id: string; campName: string; source: string; reported: number; modelExpected: number; groundTruth: number; accuracyBefore: number; accuracyAfter: number; hash: string; prevHash: string; by: string; createdAt: string };
export type LiveState = {
  camps: Camp[]; requests: Req[]; depots: Depot[]; dispatches: Dispatch[]; survivors: Person[]; metrics: Metrics;
  events: TelemetryEvt[]; weights: Weights; verifications: VerifLog[];
};

export type Role = "GOV_AGENCY" | "RELIEF_CAMP" | "RESCUE_TEAM";
export type Perm = "REBALANCE" | "APPROVE" | "SIMULATE" | "REQUEST" | "STOCK" | "REGISTER" | "DISPATCH" | "TRIAGE_STATUS" | "VERIFY" | "REINFORCE" | "FACILITY";

export type Operator = { badgeId: string; name: string; role: Role; campName: string | null; title: string; hint: string };
export const OPERATORS: Operator[] = [
  { badgeId: "NDMA-CMD-01", name: "National Disaster Command", role: "GOV_AGENCY", campName: null, title: "Cross-district rebalance, request approval, depot dispatch", hint: "NDMA-2026" },
  { badgeId: "CAMP-ALPHA-04", name: "Relief Camp Manager", role: "RELIEF_CAMP", campName: "Camp Alpha", title: "SOS requests, live inventory, survivor registration", hint: "CAMP-2026" },
  { badgeId: "NDRF-UNIT-09", name: "NDRF Field Unit", role: "RESCUE_TEAM", campName: null, title: "Convoy progress, landslide detour, mark delivered", hint: "NDRF-2026" },
];
export type OperatorUser = { badgeId: string; name: string; role: Role; campName: string | null };

export const ROLES: Record<Role, { label: string; short: string; badge: string; perms: Perm[] }> = {
  GOV_AGENCY: {
    label: "🏛️ Gov Agency (NDMA Command)", short: "Gov Agency", badge: "FULL COMMAND · REBALANCE · APPROVE",
    perms: ["REBALANCE", "APPROVE", "SIMULATE", "DISPATCH", "TRIAGE_STATUS", "VERIFY", "REINFORCE", "FACILITY"],
  },
  RELIEF_CAMP: {
    label: "⛺ Relief Camp (Camp Manager)", short: "Camp Manager", badge: "CAMP OPS · SOS REQUEST · REGISTER",
    perms: ["REQUEST", "STOCK", "REGISTER", "TRIAGE_STATUS", "FACILITY"],
  },
  RESCUE_TEAM: {
    label: "🚁 Rescue Team (NDRF Field Unit)", short: "NDRF Field Unit", badge: "FIELD OPS · DISPATCH · DELIVER",
    perms: ["DISPATCH", "VERIFY"],
  },
};

/** Role that holds a permission, used for the "Switch to Required Role" prompt. */
export const PERM_ROLE: Record<Perm, Role> = {
  REBALANCE: "GOV_AGENCY", APPROVE: "GOV_AGENCY", SIMULATE: "GOV_AGENCY", TRIAGE_STATUS: "GOV_AGENCY",
  VERIFY: "RESCUE_TEAM", REINFORCE: "GOV_AGENCY", FACILITY: "RELIEF_CAMP",
  REQUEST: "RELIEF_CAMP", STOCK: "RELIEF_CAMP", REGISTER: "RELIEF_CAMP", DISPATCH: "RESCUE_TEAM",
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

/** Food reserve a camp must keep: 24h of burn. */
export const foodReserve = (c: Camp) => c.burnRatePerHour * 24;
export const surplusPct = (c: Camp) => (foodReserve(c) > 0 ? Math.round((c.foodPackets / foodReserve(c)) * 100) : 0);

export type Mismatch = {
  food: { from: Camp; to: Camp; qty: number } | null;
  medicine: { from: Depot; to: Camp; qty: number } | null;
};
/** Shared by server (REBALANCE_SURPLUS) and client (banner) so both see the same plan. */
export function detectMismatch(camps: Camp[], depots: Depot[]): Mismatch {
  const donors = camps.filter((c) => c.foodPackets - foodReserve(c) > 0).sort((a, b) => surplusPct(b) - surplusPct(a));
  const needy = camps.filter((c) => runwayHours(c) < 3).sort((a, b) => runwayHours(a) - runwayHours(b));
  let food: Mismatch["food"] = null;
  if (donors[0] && needy[0] && donors[0].id !== needy[0].id && surplusPct(donors[0]) >= 150) {
    const from = donors[0], to = needy[0];
    const qty = Math.min(from.foodPackets - foodReserve(from), to.burnRatePerHour * 48 - to.foodPackets);
    if (qty > 0) food = { from, to, qty };
  }
  const depot = [...depots].sort((a, b) => b.medicineStock - a.medicineStock)[0];
  const sick = camps.filter((c) => c.medicalKits < c.currentOccupancy * 0.03).sort((a, b) => a.medicalKits - b.medicalKits)[0];
  let medicine: Mismatch["medicine"] = null;
  if (depot && sick) {
    const qty = Math.min(depot.medicineStock, sick.currentOccupancy - sick.medicalKits);
    if (qty > 0 && depot.medicineStock >= 400) medicine = { from: depot, to: sick, qty };
  }
  return { food, medicine };
}
