import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seedDemo } from "@/lib/demo-data";
import { AuthError, isDemoModeEnabled, type SessionUser } from "@/lib/auth";
import { detectMismatch, foodReserve, runwayHours, type LiveState, type Role, type Weights } from "@/lib/types";
import { accuracyOf, parseVerif, weightedUrgency } from "@/lib/accuracy";
import { facilityDeficit, health, parseFacilities, type FacilityKey, FACILITY_KEYS } from "@/lib/facilities";

type Tx = Prisma.TransactionClient;
type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Handler = (tx: Tx, user: SessionUser, p: Payload) => Promise<unknown>;

export class ActionError extends Error {}

const GOV: Role = "GOV_AGENCY", CAMP: Role = "RELIEF_CAMP", RESCUE: Role = "RESCUE_TEAM";
const CAMP_FIELD: Record<string, "foodPackets" | "waterLiters" | "medicalKits" | "shelterTents" | undefined> = {
  FOOD: "foodPackets", WATER: "waterLiters", MEDICINE: "medicalKits", SHELTER: "shelterTents",
};
const STOCK_FIELDS = ["foodPackets", "waterLiters", "medicalKits", "shelterTents"];
const SURVIVOR_STATUS = ["NEEDS_MEDEVAC", "SAFE_IN_CAMP", "REUNITED"];
const ROUTE = ["CLEAR", "LANDSLIDE_DETOUR", "PROGRESS_25", "DELIVERED"];
const REINFORCEMENTS = ["HELI_AIRLIFT_SQUAD", "MOBILE_ICU_TRAUMA_TEAM", "ARMY_ENGINEER_CORPS", "MOBILE_WASH_POWER_RIG"];

function guard(user: SessionUser, ...roles: Role[]) {
  if (roles.length && !roles.includes(user.role)) throw new AuthError(403, `Requires role: ${roles.join(" or ")}`);
}

function audit(json: string, by: SessionUser, event: string) {
  let j: Record<string, unknown> = {};
  try { j = JSON.parse(json); } catch { j = { raw: json }; }
  const trail = Array.isArray(j.audit) ? j.audit : [];
  return JSON.stringify({ ...j, audit: [...trail, { at: new Date().toISOString(), by: user_tag(by), event }] });
}
const user_tag = (u: SessionUser) => `${u.role}:${u.id}`;


type Camp = Prisma.ReliefCampGetPayload<object>;

async function addEvent(tx: Tx, kind: string, message: string) {
  await tx.telemetryEvent.create({ data: { kind, message } });
}

async function readWeights(tx: Tx) {
  return (
    (await tx.triageWeights.findUnique({ where: { id: "global" } })) ??
    (await tx.triageWeights.create({ data: { id: "global" } }))
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wStr = (w: { routeReliability: number; burnDrift: number; facilityPenalty: number }) =>
  `rel ${w.routeReliability.toFixed(2)} · drift ${w.burnDrift.toFixed(2)} · fac ${w.facilityPenalty.toFixed(2)}`;

/** Reinforcement-learning style weight update; every change is appended to the calibration history. */
async function learn(tx: Tx, trigger: string, change: (w: { routeReliability: number; burnDrift: number; facilityPenalty: number }) => Partial<{ routeReliability: number; burnDrift: number; facilityPenalty: number }>) {
  const w = await readWeights(tx);
  const next = { routeReliability: w.routeReliability, burnDrift: w.burnDrift, facilityPenalty: w.facilityPenalty, ...change(w) };
  next.routeReliability = +clamp(next.routeReliability, 0.5, 1.5).toFixed(3);
  next.burnDrift = +clamp(next.burnDrift, 1, 1.5).toFixed(3);
  next.facilityPenalty = +clamp(next.facilityPenalty, 0.1, 0.6).toFixed(3);
  let hist: unknown[] = [];
  try { hist = JSON.parse(w.historyJson); } catch { /* reset */ }
  hist = [{ at: new Date().toISOString(), trigger, weights: `${wStr(w)} → ${wStr(next)}` }, ...hist].slice(0, 20);
  await tx.triageWeights.update({ where: { id: "global" }, data: { ...next, historyJson: JSON.stringify(hist) } });
}

async function relearnFacilities(tx: Tx, trigger: string) {
  const camps = await tx.reliefCamp.findMany();
  const avg = camps.reduce((a, c) => a + facilityDeficit(parseFacilities(c)), 0) / Math.max(camps.length, 1);
  await learn(tx, trigger, () => ({ facilityPenalty: 0.1 + 0.5 * avg }));
}
async function relearnDrift(tx: Tx, trigger: string) {
  const camps = await tx.reliefCamp.findMany();
  const avg = camps.reduce((a, c) => a + Math.abs(accuracyOf(c as never).driftPct), 0) / Math.max(camps.length, 1);
  await learn(tx, trigger, () => ({ burnDrift: 1 + avg / 100 }));
}

/** Legitimate system movements (convoys, rebalance) shift the model baseline; manual log edits do not, so they show as drift. */
async function shiftBaseline(tx: Tx, campId: string, delta: number) {
  const c = await tx.reliefCamp.findUnique({ where: { id: campId } });
  if (!c) return;
  const v = parseVerif(c);
  await tx.reliefCamp.update({ where: { id: campId }, data: { verificationJson: JSON.stringify({ ...v, baselineFood: v.baselineFood + delta }) } });
}

async function writeFacilities(tx: Tx, c: Camp, patch: (f: ReturnType<typeof parseFacilities>) => void) {
  const f = parseFacilities(c);
  patch(f);
  return tx.reliefCamp.update({ where: { id: c.id }, data: { facilitiesJson: JSON.stringify(f) } });
}

async function audit_chain(tx: Tx, camp: Camp, source: string, truth: number, before: number, by: string) {
  await readWeights(tx);
  await tx.$queryRaw`SELECT "id" FROM "TriageWeights" WHERE "id" = 'global' FOR UPDATE`;
  const chain = await tx.triageWeights.findUniqueOrThrow({ where: { id: "global" } });
  const acc = accuracyOf(camp as never);
  const prevHash = chain.verificationHead || "GENESIS";
  const stamp = new Date().toISOString();
  const hash = createHash("sha256").update(`${prevHash}|${camp.id}|${source}|${acc.reported}|${acc.modelExpected}|${truth}|${stamp}|${by}`).digest("hex");
  const v = parseVerif(camp);
  await tx.reliefCamp.update({
    where: { id: camp.id },
    data: { foodPackets: truth, verificationJson: JSON.stringify({ ...v, baselineFood: truth, elapsedH: 0, groundTruth: truth, verifiedAt: stamp, hash }) },
  });
  const afterCamp = await tx.reliefCamp.findUniqueOrThrow({ where: { id: camp.id } });
  const after = accuracyOf(afterCamp as never).score;
  await tx.verificationLog.create({
    data: { campId: camp.id, campName: camp.name, source, reported: acc.reported, modelExpected: acc.modelExpected, groundTruth: truth, accuracyBefore: before, accuracyAfter: after, hash, prevHash, by, createdAt: new Date(stamp) },
  });
  await tx.triageWeights.update({ where: { id: "global" }, data: { verificationHead: hash } });
  return { hash, after, camp: afterCamp };
}

async function ownCamp(tx: Tx, user: SessionUser) {
  const camp = user.campId
    ? await tx.reliefCamp.findUnique({ where: { id: user.campId } })
    : user.campName ? await tx.reliefCamp.findFirst({ where: { name: user.campName } }) : null;
  if (!camp) throw new AuthError(403, "No camp assigned");
  return camp;
}

export async function getState(db: Tx | typeof prisma = prisma, viewer?: SessionUser): Promise<LiveState> {
  const survivorWhere = viewer?.role === CAMP
    ? { campId: viewer.campId ?? "__unassigned__" }
    : viewer?.role === RESCUE ? { status: "NEEDS_MEDEVAC" } : undefined;
  const [camps, requests, depots, dispatches, survivors, events, w, vlogs] = await Promise.all([
    db.reliefCamp.findMany({ orderBy: { name: "asc" } }),
    db.resourceRequest.findMany({ orderBy: { urgencyScore: "desc" } }),
    db.supplyDepot.findMany({ orderBy: { name: "asc" } }),
    db.rescueDispatch.findMany({ orderBy: { unitCode: "asc" } }),
    db.displacedPerson.findMany({ where: survivorWhere, orderBy: { fullName: "asc" } }),
    db.telemetryEvent.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    db.triageWeights.findUnique({ where: { id: "global" } }),
    db.verificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const acc = camps.map((c) => accuracyOf(c));
  const visibleSurvivors = viewer?.role === CAMP
    ? survivors.filter((person) => person.campId === viewer.campId)
    : viewer?.role === RESCUE
      ? survivors.filter((person) => person.status === "NEEDS_MEDEVAC")
      : survivors;
  const metrics = {
    criticalCamps: camps.filter((c) => c.status === "CRITICAL" || runwayHours(c) < 12).length,
    pendingSOS: requests.filter((r) => r.status === "PENDING").length,
    activeConvoys: dispatches.filter((d) => d.routeStatus !== "DELIVERED").length,
    registeredSurvivors: visibleSurvivors.length,
    activeDuplicates: requests.filter((r) => r.duplicateFlag && r.status !== "DELIVERED").length,
    minRunwayHours: +Math.min(...camps.map(runwayHours), 99).toFixed(1),
    needsMedevac: visibleSurvivors.filter((p) => p.status === "NEEDS_MEDEVAC").length,
    avgConfidence: Math.round(acc.reduce((a, x) => a + x.score, 0) / Math.max(acc.length, 1)),
    anomalies: acc.filter((x) => x.anomaly).length,
  };
  let history: Weights["history"] = [];
  try { history = JSON.parse(w?.historyJson ?? "[]"); } catch { /* empty */ }
  return {
    camps, depots, survivors: visibleSurvivors, metrics,
    requests: requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    dispatches,
    events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    weights: { routeReliability: w?.routeReliability ?? 1, burnDrift: w?.burnDrift ?? 1, facilityPenalty: w?.facilityPenalty ?? 0.25, history },
    verifications: vlogs.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
  };
}

const snap = (tx: Tx) => getState(tx);

const HANDLERS: Record<string, Handler> = {
  async REBALANCE_SURPLUS(tx, user) {
    guard(user, GOV);
    const before = await snap(tx);
    const candidate = detectMismatch(before.camps, before.depots);
    const inTransit = await tx.rescueDispatch.findMany({
      where: { routeStatus: { not: "DELIVERED" }, resourceType: { in: ["FOOD", "MEDICINE"] } },
      select: { targetCampId: true, resourceType: true },
    });
    const plan = {
      food: candidate.food && !inTransit.some((d) => d.targetCampId === candidate.food?.to.id && d.resourceType === "FOOD") ? candidate.food : null,
      medicine: candidate.medicine && !inTransit.some((d) => d.targetCampId === candidate.medicine?.to.id && d.resourceType === "MEDICINE") ? candidate.medicine : null,
    };
    const moved = { food: 0, medicine: 0, convoys: [] as string[] };
    const ids = randomUUID().slice(0, 8).toUpperCase();

    if (plan.food) {
      const { from, to, qty } = plan.food;
      const reserve = foodReserve(from);
      const debited = await tx.reliefCamp.updateMany({ where: { id: from.id, foodPackets: { gte: qty + reserve } }, data: { foodPackets: { decrement: qty } } });
      if (debited.count !== 1) throw new ActionError("Surplus stock changed; refresh and retry rebalance");
      const fromAfter = await tx.reliefCamp.findUniqueOrThrow({ where: { id: from.id } });
      await tx.reliefCamp.update({ where: { id: from.id }, data: { status: fromAfter.currentOccupancy > fromAfter.capacity ? "OVERFLOW" : runwayHours(fromAfter) < 12 ? "CRITICAL" : "STABLE" } });
      const request = await tx.resourceRequest.findFirst({
        where: { campId: to.id, resourceType: "FOOD", status: "PENDING", duplicateFlag: false, quantityNeeded: { lte: qty } },
        orderBy: { urgencyScore: "desc" },
      });
      const d = await tx.rescueDispatch.create({
        data: {
          teamName: "Auto-Rebalance Convoy", unitCode: `RB-F-${ids}`, vehicleType: "HEAVY_TRUCK", originName: from.name,
          targetCampId: to.id, targetCampName: to.name, resourceType: "FOOD", quantity: qty, etaMinutes: 60,
          routeStatus: "CLEAR", progressPercent: 10, requestId: request?.id,
        },
      });
      if (request) await tx.resourceRequest.update({ where: { id: request.id }, data: { status: "IN_TRANSIT", reasoningJson: audit(request.reasoningJson, user, `Transfer dispatched as ${d.unitCode}`) } });
      await shiftBaseline(tx, from.id, -qty);
      await addEvent(tx, "REBALANCE", `${qty} food ${from.name} → ${to.name} (${d.unitCode})`);
      moved.food = qty;
      moved.convoys.push(d.unitCode);
    }
    if (plan.medicine) {
      const { from, to, qty } = plan.medicine;
      const debited = await tx.supplyDepot.updateMany({ where: { id: from.id, medicineStock: { gte: qty } }, data: { medicineStock: { decrement: qty } } });
      if (debited.count !== 1) throw new ActionError("Depot stock changed; refresh and retry rebalance");
      const request = await tx.resourceRequest.findFirst({
        where: { campId: to.id, resourceType: "MEDICINE", status: "PENDING", duplicateFlag: false, quantityNeeded: { lte: qty } },
        orderBy: { urgencyScore: "desc" },
      });
      const d = await tx.rescueDispatch.create({
        data: {
          teamName: "Medical Airlift", unitCode: `RB-M-${ids}`, vehicleType: "HELI_AIRLIFT", originName: from.name,
          targetCampId: to.id, targetCampName: to.name, resourceType: "MEDICINE", quantity: qty, etaMinutes: 50,
          routeStatus: "CLEAR", progressPercent: 10, requestId: request?.id,
        },
      });
      if (request) await tx.resourceRequest.update({ where: { id: request.id }, data: { status: "IN_TRANSIT", reasoningJson: audit(request.reasoningJson, user, `Transfer dispatched as ${d.unitCode}`) } });
      await addEvent(tx, "REBALANCE", `${qty} medical kits ${from.name} → ${to.name} (${d.unitCode})`);
      moved.medicine = qty;
      moved.convoys.push(d.unitCode);
    }

    const after = await snap(tx);
    const pick = (s: LiveState) => ({
      alphaFood: s.camps.find((c) => c.id === plan.food?.from.id)?.foodPackets ?? null,
      deltaFood: s.camps.find((c) => c.id === plan.food?.to.id)?.foodPackets ?? null,
      deltaRunway: plan.food ? +runwayHours(s.camps.find((c) => c.id === plan.food!.to.id)!).toFixed(1) : null,
      gammaKits: s.camps.find((c) => c.id === plan.medicine?.to.id)?.medicalKits ?? null,
      depotKits: s.depots.find((d) => d.id === plan.medicine?.from.id)?.medicineStock ?? null,
      duplicates: s.metrics.activeDuplicates,
      convoys: s.metrics.activeConvoys,
    });
    return {
      ...moved,
      foodFrom: plan.food?.from.name ?? null, foodTo: plan.food?.to.name ?? null,
      medFrom: plan.medicine?.from.name ?? null, medTo: plan.medicine?.to.name ?? null,
      before: pick(before), after: pick(after),
    };
  },

  async SIMULATE_FLASH_FLOOD_SOS(tx, user) {
    guard(user, GOV);
    if (!isDemoModeEnabled()) throw new ActionError("Scenario simulation is disabled outside demo mode");
    const camps = await tx.reliefCamp.findMany();
    const target = camps.find((c) => c.name === "Camp Beta") ?? camps[0];
    if (!target) throw new ActionError("No camps");
    const influx = 120, deficit = 600, runway = 3;
    const occupancy = target.currentOccupancy + influx;
    const score = Math.round((occupancy * deficit) / runway);
    const camp = await tx.reliefCamp.update({
      where: { id: target.id },
      data: { currentOccupancy: occupancy, status: occupancy > target.capacity ? "OVERFLOW" : "CRITICAL" },
    });
    const request = await tx.resourceRequest.create({
      data: {
        campId: target.id, campName: target.name, district: target.district, resourceType: "EVACUATION",
        quantityNeeded: influx, urgencyScore: score, status: "PENDING", duplicateFlag: false,
        reasoningJson: JSON.stringify({
          event: "Flash flood + landslide SOS", occupancy, deficit, runwayHours: runway,
          formula: "(occupancy x deficit) / runwayHours", score,
          audit: [{ at: new Date().toISOString(), by: user_tag(user), event: "Flash flood SOS injected" }],
        }),
      },
    });
    const dispatch = await tx.rescueDispatch.create({
      data: {
        teamName: "NDRF Rapid Response", unitCode: `NDRF-${randomUUID().slice(0, 8).toUpperCase()}`, vehicleType: "NDRF_BOAT",
        originName: "Dehradun Central Depot", targetCampId: target.id, targetCampName: target.name,
        resourceType: "EVACUATION", quantity: influx, etaMinutes: 35, routeStatus: "LANDSLIDE_DETOUR", progressPercent: 5,
      },
    });
    return { camp, request, dispatch };
  },

  async RESET_DEMO(tx, user) {
    guard(user, GOV);
    if (!isDemoModeEnabled()) throw new ActionError("Demo reset is disabled");
    await seedDemo(tx);
    return { ok: true };
  },

  async CREATE_REQUEST(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    const type = String(p.resourceType);
    if (!["FOOD", "WATER", "MEDICINE", "SHELTER", "EVACUATION"].includes(type)) throw new ActionError("Invalid resource type");
    const qty = Number(p.quantityNeeded);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) throw new ActionError("Invalid quantity");
    const field = CAMP_FIELD[type];
    const stock = field ? camp[field] : 0;
    const deficit = Math.max(0, qty - stock);
    const runway = p.runwayHours ?? (field && camp.burnRatePerHour > 0 ? Math.max(0.5, stock / camp.burnRatePerHour) : 1);
    const w = await readWeights(tx);
    const facDef = facilityDeficit(parseFacilities(camp));
    const base = (camp.currentOccupancy * deficit) / Math.max(runway, 0.5);
    const urgencyScore = weightedUrgency(base, w, facDef);
    const dup = await tx.resourceRequest.findFirst({
      where: { campId: camp.id, resourceType: type, status: { in: ["PENDING", "ALLOCATED", "IN_TRANSIT"] } },
    });
    return tx.resourceRequest.create({
      data: {
        campId: camp.id, campName: camp.name, district: camp.district, resourceType: type, quantityNeeded: qty,
        urgencyScore, status: "PENDING", duplicateFlag: !!dup,
        reasoningJson: JSON.stringify({
          occupancy: camp.currentOccupancy, deficit, runwayHours: +Number(runway).toFixed(2),
          formula: "(occupancy x deficit) / runwayHours", baseScore: Math.round(base), facilityDeficit: facDef,
          weights: { routeReliability: w.routeReliability, burnDrift: w.burnDrift, facilityPenalty: w.facilityPenalty },
          duplicateOf: dup?.id ?? null,
          audit: [{ at: new Date().toISOString(), by: user_tag(user), event: "SOS request created" }],
        }),
      },
    });
  },

  async APPROVE_REQUEST(tx, user, p) {
    guard(user, GOV);
    let r = await tx.resourceRequest.findUnique({ where: { id: String(p.id) } });
    if (!r) throw new ActionError("Request not found");
    if (r.status !== "PENDING") return r;
    const claimed = await tx.resourceRequest.updateMany({ where: { id: r.id, status: "PENDING" }, data: { status: "IN_TRANSIT" } });
    if (claimed.count !== 1) return tx.resourceRequest.findUniqueOrThrow({ where: { id: r.id } });
    r = { ...r, status: "IN_TRANSIT" };
    const depots = await tx.supplyDepot.findMany();
    const key = { FOOD: "foodStock", WATER: "waterStock", MEDICINE: "medicineStock", SHELTER: "shelterStock" } as const;
    const k = key[r.resourceType as keyof typeof key];
    const origin = k ? [...depots].sort((a, b) => b[k] - a[k])[0] : depots[0];
    if (k && (!origin || origin[k] < r.quantityNeeded)) throw new ActionError("Insufficient depot stock for this request");
    if (origin && k) {
      const debited = await tx.supplyDepot.updateMany({ where: { id: origin.id, [k]: { gte: r.quantityNeeded } }, data: { [k]: { decrement: r.quantityNeeded } } });
      if (debited.count !== 1) throw new ActionError("Depot stock changed; refresh and retry approval");
    }
    await tx.rescueDispatch.create({
      data: {
        teamName: "Gov Allocation Convoy", unitCode: `ALC-${randomUUID().slice(0, 8).toUpperCase()}`,
        vehicleType: r.resourceType === "EVACUATION" ? "NDRF_BOAT" : "HEAVY_TRUCK",
        originName: origin?.name ?? "Dehradun Central Depot", targetCampId: r.campId, targetCampName: r.campName,
        resourceType: r.resourceType, quantity: r.quantityNeeded, etaMinutes: 90, routeStatus: "CLEAR", progressPercent: 0,
        requestId: r.id,
      },
    });
    return tx.resourceRequest.update({
      where: { id: r.id },
      data: { reasoningJson: audit(r.reasoningJson, user, `Approved, dispatched from ${origin?.name}`) },
    });
  },

  async UPDATE_CAMP_STOCK(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    if (p.campId && p.campId !== camp.id) {
      throw new AuthError(403, "Not your camp");
    }
    const field = String(p.field), delta = Number(p.delta);
    if (!STOCK_FIELDS.includes(field)) throw new ActionError("Invalid field");
    if (!Number.isInteger(delta) || Math.abs(delta) > 10000) throw new ActionError("Invalid delta");
    const where = delta < 0 ? { id: camp.id, [field]: { gte: -delta } } : { id: camp.id };
    const changed = await tx.reliefCamp.updateMany({ where, data: { [field]: { increment: delta } } });
    if (changed.count !== 1) throw new ActionError("Stock changed or is too low for that adjustment");
    const upd = await tx.reliefCamp.findUniqueOrThrow({ where: { id: camp.id } });
    // Runway is derived from stock; refresh the status flag so map nodes and charts follow immediately.
    const status = upd.currentOccupancy > upd.capacity ? "OVERFLOW" : runwayHours(upd) < 12 ? "CRITICAL" : "STABLE";
    return tx.reliefCamp.update({ where: { id: camp.id }, data: { status } });
  },

  async UPDATE_DISPATCH_STATUS(tx, user, p) {
    guard(user, RESCUE, GOV);
    const status = String(p.status);
    if (!ROUTE.includes(status)) throw new ActionError("Invalid route status");
    const d = await tx.rescueDispatch.findUnique({ where: { id: String(p.id) } });
    if (!d) throw new ActionError("Dispatch not found");
    if (d.routeStatus === "DELIVERED") return d;
    if (status === "CLEAR" || status === "LANDSLIDE_DETOUR") {
      if (status !== d.routeStatus) {
        await addEvent(tx, "ROUTE", `${d.unitCode} route ${status}`);
        if (status === "LANDSLIDE_DETOUR") await learn(tx, `LANDSLIDE_DETOUR ${d.unitCode}`, (w) => ({ routeReliability: w.routeReliability - 0.05 }));
        else await learn(tx, `ROUTE_CLEARED ${d.unitCode}`, (w) => ({ routeReliability: w.routeReliability + 0.02 }));
      }
      return tx.rescueDispatch.update({ where: { id: d.id }, data: { routeStatus: status } });
    }
    if (status === "PROGRESS_25") {
      const progressPercent = Math.min(99, d.progressPercent + 25);
      const etaMinutes = Math.round(d.etaMinutes * (1 - (progressPercent - d.progressPercent) / Math.max(100 - d.progressPercent, 1)));
      return tx.rescueDispatch.update({ where: { id: d.id }, data: { progressPercent, etaMinutes } });
    }
    const deliveryClaim = await tx.rescueDispatch.updateMany({
      where: { id: d.id, routeStatus: { not: "DELIVERED" } },
      data: { routeStatus: "DELIVERED", progressPercent: 100, etaMinutes: 0, stockApplied: true },
    });
    if (deliveryClaim.count !== 1) return tx.rescueDispatch.findUniqueOrThrow({ where: { id: d.id } });
    const field = CAMP_FIELD[d.resourceType];
    if (field && !d.stockApplied) {
      await tx.reliefCamp.update({ where: { id: d.targetCampId }, data: { [field]: { increment: d.quantity } } });
      const updated = await tx.reliefCamp.findUniqueOrThrow({ where: { id: d.targetCampId } });
      const status = updated.currentOccupancy > updated.capacity ? "OVERFLOW" : runwayHours(updated) < 12 ? "CRITICAL" : "STABLE";
      await tx.reliefCamp.update({ where: { id: d.targetCampId }, data: { status } });
      if (field === "foodPackets") await shiftBaseline(tx, d.targetCampId, d.quantity);
    }
    await addEvent(tx, "DELIVERY", `${d.unitCode} delivered ${d.quantity} ${d.resourceType} → ${d.targetCampName}`);
    await learn(tx, `DELIVERY_COMPLETE ${d.unitCode}`, (w) => ({ routeReliability: w.routeReliability + 0.03 }));
    if (d.requestId) {
      const request = await tx.resourceRequest.findUnique({ where: { id: d.requestId } });
      if (request && request.status === "IN_TRANSIT") {
        if (d.resourceType === "FACILITY_REPAIR") {
          const key = JSON.parse(request.reasoningJson).facility as FacilityKey;
          if (FACILITY_KEYS.includes(key)) {
            const camp = await tx.reliefCamp.findUnique({ where: { id: d.targetCampId } });
            if (camp) {
              await writeFacilities(tx, camp, (f) => {
                if (key === "power") { f.power.pct = 95; f.power.backupHours = 36; }
                if (key === "wash") { f.wash.contamination = "LOW"; f.wash.bioToilets += 6; }
                if (key === "filtration") f.filtration.pct = 95;
                if (key === "medical") { f.medical.coldChainPct = 90; f.medical.oxygenCylinders += 6; }
                if (key === "comms") f.comms.signalPct = 90;
                f.repairRequested = f.repairRequested.filter((x) => x !== key);
              });
              await relearnFacilities(tx, `REPAIR_DELIVERED ${camp.name}/${key}`);
            }
          }
        }
        await tx.resourceRequest.update({ where: { id: request.id }, data: { status: "DELIVERED", reasoningJson: audit(request.reasoningJson, user, `Delivered by ${d.unitCode}`) } });
      }
    }
    return tx.rescueDispatch.findUniqueOrThrow({ where: { id: d.id } });
  },

  async REGISTER_SURVIVOR(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    const fullName = String(p.fullName ?? "").trim(), age = Number(p.age);
    if (!fullName || !Number.isInteger(age) || age < 0 || age > 120) throw new ActionError("Invalid survivor details");
    return tx.displacedPerson.create({
      data: {
        fullName, age, medicalNeeds: String(p.medicalNeeds || "None"), currentCampName: camp.name, campId: camp.id, district: camp.district,
        familyGroupCode: String(p.familyGroupCode || "FAM-NEW").toUpperCase(), status: "SAFE_IN_CAMP",
      },
    });
  },

  async UPDATE_SURVIVOR_STATUS(tx, user, p) {
    guard(user, GOV, CAMP, RESCUE);
    const status = String(p.status);
    if (!SURVIVOR_STATUS.includes(status)) throw new ActionError("Invalid status");
    const person = await tx.displacedPerson.findUnique({ where: { id: String(p.id) } });
    if (!person) throw new ActionError("Survivor not found");
    if (user.role === CAMP && person.campId !== user.campId) throw new AuthError(403, "Not your camp");
    return tx.displacedPerson.update({ where: { id: person.id }, data: { status } });
  },

  async VERIFY_GROUND_TRUTH(tx, user, p) {
    guard(user, RESCUE, GOV);
    const camp = await tx.reliefCamp.findUnique({ where: { id: String(p.campId) } });
    if (!camp) throw new ActionError("Camp not found");
    const before = accuracyOf(camp as never);
    const measured = Number(p.measured);
    if (!Number.isSafeInteger(measured) || measured < 0 || measured > 10_000_000) throw new ActionError("Enter an observed whole-number food count");
    const truth = measured;
    const r = await audit_chain(tx, camp, "FIELD_GROUND_TRUTH", truth, before.score, user_tag(user));
    const rw = runwayHours(r.camp);
    await tx.reliefCamp.update({ where: { id: camp.id }, data: { status: rw < 3 ? "CRITICAL" : r.camp.status === "CRITICAL" && rw >= 12 ? "STABLE" : r.camp.status } });
    await addEvent(tx, "VERIFY", `${camp.name} ground truth ${truth} (log ${before.reported}, model ${before.modelExpected}) · hash ${r.hash.slice(0, 10)}`);
    await relearnDrift(tx, `VERIFY ${camp.name}`);
    return { campName: camp.name, before, after: accuracyOf(r.camp as never), hash: r.hash, corrected: truth !== before.reported };
  },

  async UPDATE_FACILITY_STATUS(tx, user, p) {
    guard(user, GOV, CAMP, RESCUE);
    const key = String(p.facility) as FacilityKey;
    if (!FACILITY_KEYS.includes(key)) throw new ActionError("Invalid facility");
    const mode = String(p.mode ?? "REQUEST_REPAIR");
    let camp: Camp | null;
    if (user.role === CAMP) {
      camp = await ownCamp(tx, user);
      if (p.campId && p.campId !== camp.id) throw new AuthError(403, "Not your camp");
    }
    else camp = await tx.reliefCamp.findUnique({ where: { id: String(p.campId) } });
    if (!camp) throw new ActionError("Camp not found");

    if (mode === "SET") {
      guard(user, GOV, RESCUE);
      const patch = (p.patch ?? {}) as Record<string, unknown>;
      const upd = await writeFacilities(tx, camp, (f) => {
        const cur = f[key] as Record<string, unknown>;
        for (const [k, v] of Object.entries(patch)) {
          if (!(k in cur) || typeof v !== typeof cur[k]) continue;
          cur[k] = typeof v === "number" ? Math.max(0, Math.min(k.endsWith("Pct") || k === "pct" ? 100 : 100000, v)) : v;
        }
      });
      await addEvent(tx, "FACILITY", `${camp.name} ${key} updated by field audit`);
      await relearnFacilities(tx, `FACILITY_UPDATE ${camp.name}/${key}`);
      return upd;
    }
    if (mode !== "REQUEST_REPAIR") throw new ActionError("Invalid mode");
    guard(user, GOV, CAMP);
    const f = parseFacilities(camp);
    if (f.repairRequested.includes(key)) throw new ActionError("Repair already requested for this facility");
    const hl = health(f)[key];
    const w = await readWeights(tx);
    const runway = key === "power" ? Math.max(0.5, f.power.backupHours) : Math.max(0.5, runwayHours(camp));
    const base = (camp.currentOccupancy * (100 - hl)) / runway;
    const facDef = facilityDeficit(f);
    const req = await tx.resourceRequest.create({
      data: {
        campId: camp.id, campName: camp.name, district: camp.district, resourceType: "FACILITY_REPAIR", quantityNeeded: 1,
        urgencyScore: weightedUrgency(base, w, facDef), status: "PENDING", duplicateFlag: false,
        reasoningJson: JSON.stringify({
          facility: key, healthPct: hl, occupancy: camp.currentOccupancy, deficit: 100 - hl, runwayHours: +runway.toFixed(1),
          formula: "(occupancy x deficit) / runwayHours", baseScore: Math.round(base), facilityDeficit: facDef,
          weights: { routeReliability: w.routeReliability, burnDrift: w.burnDrift, facilityPenalty: w.facilityPenalty },
          audit: [{ at: new Date().toISOString(), by: user_tag(user), event: `Facility upgrade/repair requested: ${key}` }],
        }),
      },
    });
    await writeFacilities(tx, camp, (x) => { x.repairRequested = [...x.repairRequested, key]; });
    await addEvent(tx, "FACILITY", `${camp.name}: ${key} repair requested (health ${hl}%)`);
    return req;
  },

  async DEPLOY_REINFORCEMENT(tx, user, p) {
    guard(user, GOV);
    if (!isDemoModeEnabled()) throw new ActionError("Synthetic reinforcement is disabled outside demo mode");
    const kind = String(p.kind);
    if (!REINFORCEMENTS.includes(kind)) throw new ActionError("Unknown reinforcement unit");
    const code = `REINF-${kind.split("_")[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const origin = "Dehradun Central Depot";
    const spawn = (camp: Camp, vehicleType: string, teamName: string, eta: number) =>
      tx.rescueDispatch.create({
        data: {
          teamName, unitCode: code, vehicleType, originName: origin, targetCampId: camp.id, targetCampName: camp.name,
          resourceType: "REINFORCEMENT", quantity: 1, etaMinutes: eta, routeStatus: "CLEAR", progressPercent: 15, stockApplied: true,
        },
      });
    /** Reinforcement supplies shorten survival runway pressure immediately. */
    const boost = async (camp: Camp, hours: number) => {
      const add = camp.burnRatePerHour * hours;
      const u = await tx.reliefCamp.update({ where: { id: camp.id }, data: { foodPackets: { increment: add } } });
      await shiftBaseline(tx, camp.id, add);
      const rw = runwayHours(u);
      await tx.reliefCamp.update({ where: { id: camp.id }, data: { status: rw >= 12 ? "STABLE" : u.status } });
    };
    const needCamp = async () => {
      const c = await tx.reliefCamp.findUnique({ where: { id: String(p.campId) } });
      if (!c) throw new ActionError("Select a target camp");
      return c;
    };

    if (kind === "HELI_AIRLIFT_SQUAD") {
      const d =
        (p.dispatchId ? await tx.rescueDispatch.findUnique({ where: { id: String(p.dispatchId) } }) : null) ??
        (p.campId ? await tx.rescueDispatch.findFirst({ where: { targetCampId: String(p.campId), routeStatus: "LANDSLIDE_DETOUR" } }) : null);
      if (!d || d.routeStatus === "DELIVERED") throw new ActionError("No stalled convoy to bypass");
      const out = await tx.rescueDispatch.update({
        where: { id: d.id },
        data: { vehicleType: "HELI_AIRLIFT", teamName: `${d.teamName} + Heli Squad`, routeStatus: "CLEAR", etaMinutes: Math.round(d.etaMinutes * 0.3) },
      });
      await addEvent(tx, "REINFORCE", `Heli Airlift Squad bypassed ${d.unitCode}: ETA ${d.etaMinutes}→${out.etaMinutes} min`);
      await learn(tx, `HELI_BYPASS ${d.unitCode}`, (w) => ({ routeReliability: w.routeReliability + 0.04 }));
      return { kind, dispatch: out };
    }
    if (kind === "ARMY_ENGINEER_CORPS") {
      const camp = p.campId ? await needCamp() : null;
      const stalled = await tx.rescueDispatch.findMany({
        where: p.dispatchId ? { id: String(p.dispatchId), routeStatus: "LANDSLIDE_DETOUR" } : { ...(camp ? { targetCampId: camp.id } : {}), routeStatus: "LANDSLIDE_DETOUR" },
      });
      if (!stalled.length) throw new ActionError("No landslide-blocked route to clear");
      for (const d of stalled) {
        await tx.rescueDispatch.update({ where: { id: d.id }, data: { routeStatus: "CLEAR", etaMinutes: Math.round(d.etaMinutes * 0.75) } });
      }
      const target = camp ?? (await tx.reliefCamp.findUniqueOrThrow({ where: { id: stalled[0].targetCampId } }));
      await spawn(target, "HEAVY_TRUCK", "Army Engineer Corps", 25);
      await boost(target, 2);
      await addEvent(tx, "REINFORCE", `Army Engineers cleared ${stalled.length} landslide route(s) to ${target.name}`);
      await learn(tx, `ENGINEERS_CLEARED ${target.name}`, (w) => ({ routeReliability: w.routeReliability + 0.04 * stalled.length }));
      return { kind, cleared: stalled.length };
    }
    const camp = await needCamp();
    if (kind === "MOBILE_ICU_TRAUMA_TEAM") {
      await writeFacilities(tx, camp, (f) => { f.medical.traumaBeds += 15; f.medical.icuBeds += 2; f.medical.oxygenCylinders += 10; });
      await tx.reliefCamp.update({ where: { id: camp.id }, data: { medicalKits: { increment: 100 } } });
      await boost(camp, 4);
      await spawn(camp, "HELI_AIRLIFT", "Mobile ICU/Trauma Team", 30);
      await addEvent(tx, "REINFORCE", `Mobile ICU/Trauma Team → ${camp.name}: +15 trauma beds, +100 medical kits`);
      await relearnFacilities(tx, `ICU_TEAM ${camp.name}`);
      return { kind, camp: camp.name };
    }
    // MOBILE_WASH_POWER_RIG
    await writeFacilities(tx, camp, (f) => {
      f.power.pct = 100; f.power.backupHours = 48; f.filtration.pct = 100; f.wash.contamination = "LOW";
      f.wash.bioToilets += 10; f.repairRequested = f.repairRequested.filter((k) => k !== "power" && k !== "filtration" && k !== "wash");
    });
    await boost(camp, 6);
    await spawn(camp, "HEAVY_TRUCK", "Mobile WASH/Power Rig", 40);
    await addEvent(tx, "REINFORCE", `Mobile WASH/Power Rig → ${camp.name}: generator & filtration 100%`);
    await relearnFacilities(tx, `WASH_RIG ${camp.name}`);
    return { kind, camp: camp.name };
  },

};

export const ACTIONS = Object.keys(HANDLERS);

/** Runs one action in a single atomic transaction and returns the fresh full state. */
export async function runAction(user: SessionUser, action: string, payload: Payload = {}, packetId?: string) {
  const h = HANDLERS[action];
  if (!h) throw new ActionError("Unknown action");
  return prisma.$transaction(
    async (tx) => {
      if (packetId) {
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(packetId)) throw new ActionError("Invalid packet ID");
        const prior = await tx.actionReceipt.findUnique({ where: { id: packetId } });
        if (prior) {
          if (prior.actorBadgeId !== user.badgeId) throw new AuthError(403, "Packet belongs to another operator");
          return { result: { replayed: true }, state: await getState(tx, user) };
        }
      }
      const result = await h(tx, user, payload ?? {});
      if (packetId) await tx.actionReceipt.create({ data: { id: packetId, actorBadgeId: user.badgeId } });
      return { result, state: await getState(tx, user) };
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
