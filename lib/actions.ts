import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seedDemo } from "@/lib/demo-data";
import { AuthError, type SessionUser } from "@/lib/auth";
import { detectMismatch, runwayHours, type LiveState, type Role, type Weights } from "@/lib/types";
import { accuracyOf, parseVerif, weightedUrgency } from "@/lib/accuracy";
import { facilityDeficit, health, parseFacilities, type FacilityKey, FACILITY_KEYS } from "@/lib/facilities";

type Tx = Prisma.TransactionClient;
type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Handler = (tx: Tx, user: SessionUser, p: Payload) => Promise<unknown>;

const GOV: Role = "GOV_AGENCY", CAMP: Role = "RELIEF_CAMP", RESCUE: Role = "RESCUE_TEAM";
const CAMP_FIELD: Record<string, "foodPackets" | "waterLiters" | "medicalKits" | "shelterTents" | undefined> = {
  FOOD: "foodPackets", WATER: "waterLiters", MEDICINE: "medicalKits", SHELTER: "shelterTents",
};
const STOCK_FIELDS = ["foodPackets", "waterLiters", "medicalKits", "shelterTents"];
const SURVIVOR_STATUS = ["NEEDS_MEDEVAC", "SAFE_IN_CAMP", "REUNITED"];
const ROUTE = ["CLEAR", "LANDSLIDE_DETOUR", "PROGRESS_25", "DELIVERED"];
let lastTick = 0;
let tickN = 0;
const REINFORCEMENTS = ["HELI_AIRLIFT_SQUAD", "MOBILE_ICU_TRAUMA_TEAM", "ARMY_ENGINEER_CORPS", "MOBILE_WASH_POWER_RIG"];
const WEATHER = ["Radar: heavy rain cell over Chamoli, 40 min to Camp Delta", "Radar: Alaknanda river level +0.4 m, landslide risk HIGH", "Radar: cloud break over Uttarkashi, heli window open", "Radar: gusts 38 km/h Rudraprayag, rotor ops restricted"];

function guard(user: SessionUser, ...roles: Role[]) {
  if (roles.length && !roles.includes(user.role)) throw new AuthError(403, `Requires role: ${roles.join(" or ")}`);
}

function audit(json: string, by: SessionUser, event: string) {
  let j: Record<string, unknown> = {};
  try { j = JSON.parse(json); } catch { j = { raw: json }; }
  const trail = Array.isArray(j.audit) ? j.audit : [];
  return JSON.stringify({ ...j, audit: [...trail, { at: new Date().toISOString(), by: user_tag(by), event }] });
}
const user_tag = (u: SessionUser) => `${u.badgeId} (${u.role})`;


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
  const prev = await tx.verificationLog.findFirst({ orderBy: { createdAt: "desc" } });
  const acc = accuracyOf(camp as never);
  const prevHash = prev?.hash ?? "GENESIS";
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
    data: { campId: camp.id, campName: camp.name, source, reported: acc.reported, modelExpected: acc.modelExpected, groundTruth: truth, accuracyBefore: before, accuracyAfter: after, hash, prevHash, by },
  });
  return { hash, after, camp: afterCamp };
}

async function ownCamp(tx: Tx, user: SessionUser) {
  const camp = user.campName ? await tx.reliefCamp.findFirst({ where: { name: user.campName } }) : null;
  if (!camp) throw new AuthError(403, "No camp assigned");
  return camp;
}

export async function getState(db: Tx | typeof prisma = prisma): Promise<LiveState> {
  const [camps, requests, depots, dispatches, survivors, events, w, vlogs] = await Promise.all([
    db.reliefCamp.findMany({ orderBy: { name: "asc" } }),
    db.resourceRequest.findMany({ orderBy: { urgencyScore: "desc" } }),
    db.supplyDepot.findMany({ orderBy: { name: "asc" } }),
    db.rescueDispatch.findMany({ orderBy: { unitCode: "asc" } }),
    db.displacedPerson.findMany({ orderBy: { fullName: "asc" } }),
    db.telemetryEvent.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    db.triageWeights.findUnique({ where: { id: "global" } }),
    db.verificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const acc = camps.map((c) => accuracyOf(c));
  const metrics = {
    criticalCamps: camps.filter((c) => c.status === "CRITICAL" || runwayHours(c) < 12).length,
    pendingSOS: requests.filter((r) => r.status === "PENDING").length,
    activeConvoys: dispatches.filter((d) => d.routeStatus !== "DELIVERED").length,
    registeredSurvivors: survivors.length,
    activeDuplicates: requests.filter((r) => r.duplicateFlag && r.status !== "DELIVERED").length,
    minRunwayHours: +Math.min(...camps.map(runwayHours), 99).toFixed(1),
    needsMedevac: survivors.filter((p) => p.status === "NEEDS_MEDEVAC").length,
    avgConfidence: Math.round(acc.reduce((a, x) => a + x.score, 0) / Math.max(acc.length, 1)),
    anomalies: acc.filter((x) => x.anomaly).length,
  };
  let history: Weights["history"] = [];
  try { history = JSON.parse(w?.historyJson ?? "[]"); } catch { /* empty */ }
  return {
    camps, depots, survivors, metrics,
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
    const plan = detectMismatch(before.camps, before.depots);
    const moved = { food: 0, medicine: 0, convoys: [] as string[] };
    const ids = Date.now() % 100000;

    if (plan.food) {
      const { from, to, qty } = plan.food;
      await tx.reliefCamp.update({ where: { id: from.id }, data: { foodPackets: { decrement: qty }, status: "STABLE" } });
      const after = to.foodPackets + qty;
      await tx.reliefCamp.update({ where: { id: to.id }, data: { foodPackets: { increment: qty }, status: after / to.burnRatePerHour >= 12 ? "STABLE" : to.status } });
      const d = await tx.rescueDispatch.create({
        data: {
          teamName: "Auto-Rebalance Convoy", unitCode: `RB-F-${ids}`, vehicleType: "HEAVY_TRUCK", originName: from.name,
          targetCampId: to.id, targetCampName: to.name, resourceType: "FOOD", quantity: qty, etaMinutes: 60,
          routeStatus: "CLEAR", progressPercent: 10, stockApplied: true,
        },
      });
      await shiftBaseline(tx, from.id, -qty);
      await shiftBaseline(tx, to.id, qty);
      await addEvent(tx, "REBALANCE", `${qty} food ${from.name} → ${to.name} (${d.unitCode})`);
      moved.food = qty;
      moved.convoys.push(d.unitCode);
    }
    if (plan.medicine) {
      const { from, to, qty } = plan.medicine;
      await tx.supplyDepot.update({ where: { id: from.id }, data: { medicineStock: { decrement: qty } } });
      await tx.reliefCamp.update({ where: { id: to.id }, data: { medicalKits: { increment: qty }, status: "STABLE" } });
      const d = await tx.rescueDispatch.create({
        data: {
          teamName: "Medical Airlift", unitCode: `RB-M-${ids}`, vehicleType: "HELI_AIRLIFT", originName: from.name,
          targetCampId: to.id, targetCampName: to.name, resourceType: "MEDICINE", quantity: qty, etaMinutes: 50,
          routeStatus: "CLEAR", progressPercent: 10, stockApplied: true,
        },
      });
      await addEvent(tx, "REBALANCE", `${qty} medical kits ${from.name} → ${to.name} (${d.unitCode})`);
      moved.medicine = qty;
      moved.convoys.push(d.unitCode);
    }

    // Resolve duplicates + flip matching requests to IN_TRANSIT with audit trail.
    const open = await tx.resourceRequest.findMany({ where: { OR: [{ duplicateFlag: true }, { status: "PENDING" }] } });
    for (const r of open) {
      let status = r.status, flag = r.duplicateFlag, event = "";
      if (r.duplicateFlag) {
        flag = false;
        if (r.status !== "DELIVERED") status = "RESOLVED";
        event = "Duplicate shipment resolved by 1-Tap Rebalance";
      } else if (plan.food && r.campId === plan.food.to.id && r.resourceType === "FOOD") {
        status = "IN_TRANSIT"; event = `Fulfilled by surplus from ${plan.food.from.name}`;
      } else if (plan.medicine && r.campId === plan.medicine.to.id && r.resourceType === "MEDICINE") {
        status = "IN_TRANSIT"; event = `Fulfilled by ${plan.medicine.from.name} medical kits`;
      } else continue;
      await tx.resourceRequest.update({ where: { id: r.id }, data: { status, duplicateFlag: flag, reasoningJson: audit(r.reasoningJson, user, event) } });
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
    const camps = await tx.reliefCamp.findMany();
    const target = camps.find((c) => c.name === "Camp Beta") ?? camps[0];
    if (!target) throw new Error("No camps");
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
        teamName: "NDRF Rapid Response", unitCode: `NDRF-${Date.now() % 1000}`, vehicleType: "NDRF_BOAT",
        originName: "Dehradun Central Depot", targetCampId: target.id, targetCampName: target.name,
        resourceType: "EVACUATION", quantity: influx, etaMinutes: 35, routeStatus: "LANDSLIDE_DETOUR", progressPercent: 5,
      },
    });
    return { camp, request, dispatch };
  },

  async RESET_DEMO(tx) {
    // Demo utility: any signed-in operator may restore the seed crisis.
    await seedDemo(tx);
    return { ok: true };
  },

  async CREATE_REQUEST(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    const type = String(p.resourceType);
    if (!["FOOD", "WATER", "MEDICINE", "SHELTER", "EVACUATION"].includes(type)) throw new Error("Invalid resource type");
    const qty = Number(p.quantityNeeded);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) throw new Error("Invalid quantity");
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
    const r = await tx.resourceRequest.findUnique({ where: { id: String(p.id) } });
    if (!r) throw new Error("Request not found");
    if (r.status !== "PENDING") return r;
    const depots = await tx.supplyDepot.findMany();
    const key = { FOOD: "foodStock", WATER: "waterStock", MEDICINE: "medicineStock", SHELTER: "shelterStock" } as const;
    const k = key[r.resourceType as keyof typeof key];
    const origin = k ? [...depots].sort((a, b) => b[k] - a[k])[0] : depots[0];
    if (r.resourceType === "FACILITY_REPAIR") {
      const key = JSON.parse(r.reasoningJson).facility as FacilityKey;
      const camp = await tx.reliefCamp.findUnique({ where: { id: r.campId } });
      if (camp && FACILITY_KEYS.includes(key)) {
        await writeFacilities(tx, camp, (f) => {
          if (key === "power") { f.power.pct = 95; f.power.backupHours = 36; }
          if (key === "wash") { f.wash.contamination = "LOW"; f.wash.bioToilets += 6; }
          if (key === "filtration") f.filtration.pct = 95;
          if (key === "medical") { f.medical.coldChainPct = 90; f.medical.oxygenCylinders += 6; }
          if (key === "comms") f.comms.signalPct = 90;
          f.repairRequested = f.repairRequested.filter((x) => x !== key);
        });
        await relearnFacilities(tx, `REPAIR_APPROVED ${camp.name}/${key}`);
      }
    }
    if (origin && k) {
      await tx.supplyDepot.update({ where: { id: origin.id }, data: { [k]: Math.max(0, origin[k] - r.quantityNeeded) } });
    }
    await tx.rescueDispatch.create({
      data: {
        teamName: "Gov Allocation Convoy", unitCode: `ALC-${Date.now() % 100000}`,
        vehicleType: r.resourceType === "EVACUATION" ? "NDRF_BOAT" : "HEAVY_TRUCK",
        originName: origin?.name ?? "Dehradun Central Depot", targetCampId: r.campId, targetCampName: r.campName,
        resourceType: r.resourceType, quantity: r.quantityNeeded, etaMinutes: 90, routeStatus: "CLEAR", progressPercent: 0,
      },
    });
    return tx.resourceRequest.update({
      where: { id: r.id },
      data: { status: "IN_TRANSIT", reasoningJson: audit(r.reasoningJson, user, `Approved, dispatched from ${origin?.name}`) },
    });
  },

  async UPDATE_CAMP_STOCK(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    if (p.campId && p.campId !== camp.id && !(await tx.reliefCamp.findFirst({ where: { id: p.campId, name: camp.name } }))) {
      throw new AuthError(403, "Not your camp");
    }
    const field = String(p.field), delta = Number(p.delta);
    if (!STOCK_FIELDS.includes(field)) throw new Error("Invalid field");
    if (!Number.isInteger(delta) || Math.abs(delta) > 10000) throw new Error("Invalid delta");
    const cur = camp[field as (typeof STOCK_FIELDS)[number] & keyof typeof camp] as number;
    const next = Math.max(0, cur + delta);
    const upd = await tx.reliefCamp.update({ where: { id: camp.id }, data: { [field]: next } });
    // Runway is derived from stock; refresh the status flag so map nodes and charts follow immediately.
    const status = runwayHours(upd) < 3 ? "CRITICAL" : upd.status === "CRITICAL" && runwayHours(upd) >= 12 ? "STABLE" : upd.status;
    return tx.reliefCamp.update({ where: { id: camp.id }, data: { status } });
  },

  async UPDATE_DISPATCH_STATUS(tx, user, p) {
    guard(user, RESCUE, GOV);
    const status = String(p.status);
    if (!ROUTE.includes(status)) throw new Error("Invalid route status");
    const d = await tx.rescueDispatch.findUnique({ where: { id: String(p.id) } });
    if (!d) throw new Error("Dispatch not found");
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
    const field = CAMP_FIELD[d.resourceType];
    if (field && !d.stockApplied) {
      await tx.reliefCamp.update({ where: { id: d.targetCampId }, data: { [field]: { increment: d.quantity }, status: "STABLE" } });
      if (field === "foodPackets") await shiftBaseline(tx, d.targetCampId, d.quantity);
    }
    if (field === "foodPackets") {
      // Physical audit on delivery: NDRF counts the food on the ground.
      const tc = await tx.reliefCamp.findUnique({ where: { id: d.targetCampId } });
      if (tc) await audit_chain(tx, tc, "FIELD_GROUND_TRUTH", tc.foodPackets, accuracyOf(tc as never).score, user_tag(user));
    }
    await addEvent(tx, "DELIVERY", `${d.unitCode} delivered ${d.quantity} ${d.resourceType} → ${d.targetCampName}`);
    await learn(tx, `DELIVERY_COMPLETE ${d.unitCode}`, (w) => ({ routeReliability: w.routeReliability + 0.03 }));
    const reqs = await tx.resourceRequest.findMany({
      where: { campId: d.targetCampId, resourceType: d.resourceType, status: { in: ["ALLOCATED", "IN_TRANSIT"] } },
    });
    for (const r of reqs) {
      await tx.resourceRequest.update({ where: { id: r.id }, data: { status: "DELIVERED", reasoningJson: audit(r.reasoningJson, user, `Delivered by ${d.unitCode}`) } });
    }
    return tx.rescueDispatch.update({ where: { id: d.id }, data: { routeStatus: "DELIVERED", progressPercent: 100, etaMinutes: 0, stockApplied: true } });
  },

  async REGISTER_SURVIVOR(tx, user, p) {
    guard(user, CAMP);
    const camp = await ownCamp(tx, user);
    const fullName = String(p.fullName ?? "").trim(), age = Number(p.age);
    if (!fullName || !Number.isInteger(age) || age < 0 || age > 120) throw new Error("Invalid survivor details");
    return tx.displacedPerson.create({
      data: {
        fullName, age, medicalNeeds: String(p.medicalNeeds || "None"), currentCampName: camp.name, district: camp.district,
        familyGroupCode: String(p.familyGroupCode || "FAM-NEW").toUpperCase(), status: "SAFE_IN_CAMP",
      },
    });
  },

  async UPDATE_SURVIVOR_STATUS(tx, user, p) {
    guard(user, GOV, CAMP);
    const status = String(p.status);
    if (!SURVIVOR_STATUS.includes(status)) throw new Error("Invalid status");
    const person = await tx.displacedPerson.findUnique({ where: { id: String(p.id) } });
    if (!person) throw new Error("Survivor not found");
    if (user.role === CAMP && person.currentCampName !== user.campName) throw new AuthError(403, "Not your camp");
    return tx.displacedPerson.update({ where: { id: person.id }, data: { status } });
  },

  async VERIFY_GROUND_TRUTH(tx, user, p) {
    guard(user, RESCUE, GOV);
    const camp = await tx.reliefCamp.findUnique({ where: { id: String(p.campId) } });
    if (!camp) throw new Error("Camp not found");
    const before = accuracyOf(camp as never);
    const measured = p.measured == null ? null : Number(p.measured);
    if (measured != null && (!Number.isInteger(measured) || measured < 0)) throw new Error("Invalid measured count");
    // Field audit: a physical count wins; otherwise a flagged anomaly is calibrated back to the burn-rate model.
    const truth = measured ?? (before.anomaly ? before.modelExpected : camp.foodPackets);
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
    if (!FACILITY_KEYS.includes(key)) throw new Error("Invalid facility");
    const mode = String(p.mode ?? "REQUEST_REPAIR");
    let camp: Camp | null;
    if (user.role === CAMP) {
      camp = await ownCamp(tx, user);
      if (p.campId && p.campId !== camp.id) throw new AuthError(403, "Not your camp");
    }
    else camp = await tx.reliefCamp.findUnique({ where: { id: String(p.campId) } });
    if (!camp) throw new Error("Camp not found");

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
    if (mode !== "REQUEST_REPAIR") throw new Error("Invalid mode");
    guard(user, GOV, CAMP);
    const f = parseFacilities(camp);
    if (f.repairRequested.includes(key)) throw new Error("Repair already requested for this facility");
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
    const kind = String(p.kind);
    if (!REINFORCEMENTS.includes(kind)) throw new Error("Unknown reinforcement unit");
    const code = `REINF-${kind.split("_")[0]}-${Date.now() % 10000}`;
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
      if (!c) throw new Error("Select a target camp");
      return c;
    };

    if (kind === "HELI_AIRLIFT_SQUAD") {
      const d =
        (p.dispatchId ? await tx.rescueDispatch.findUnique({ where: { id: String(p.dispatchId) } }) : null) ??
        (p.campId ? await tx.rescueDispatch.findFirst({ where: { targetCampId: String(p.campId), routeStatus: "LANDSLIDE_DETOUR" } }) : null);
      if (!d || d.routeStatus === "DELIVERED") throw new Error("No stalled convoy to bypass");
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
      if (!stalled.length) throw new Error("No landslide-blocked route to clear");
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

  async TELEMETRY_TICK(tx, _user, p) {
    const now = Date.now();
    if (!p.force && now - lastTick < 1800) return { ticked: false };
    lastTick = now;
    tickN += 1;
    const live = await tx.rescueDispatch.findMany({ where: { routeStatus: { not: "DELIVERED" } } });
    for (const d of live) {
      if (d.routeStatus !== "CLEAR" || d.progressPercent >= 95) continue;
      const progressPercent = Math.min(95, d.progressPercent + 2);
      await tx.rescueDispatch.update({ where: { id: d.id }, data: { progressPercent, etaMinutes: Math.max(0, d.etaMinutes - 1) } });
      if (Math.floor(progressPercent / 25) > Math.floor(d.progressPercent / 25)) {
        await addEvent(tx, "CONVOY", `${d.unitCode} GPS ping · ${progressPercent}% → ${d.targetCampName}`);
      }
    }
    const camps = await tx.reliefCamp.findMany({ orderBy: { name: "asc" } });
    const c = camps[tickN % Math.max(camps.length, 1)];
    if (c) await addEvent(tx, "BURN_RATE", `${c.name} burn ${c.burnRatePerHour}/h · food runway ${runwayHours(c).toFixed(1)}h`);
    if (tickN % 4 === 0) {
      const worst = camps.map((x) => ({ x, h: health(parseFacilities(x)) })).flatMap(({ x, h }) => FACILITY_KEYS.map((k) => ({ x, k, v: h[k] }))).sort((a, b) => a.v - b.v)[0];
      if (worst && worst.v < 40) await addEvent(tx, "FACILITY", `ALERT ${worst.x.name} ${worst.k} health ${worst.v}%`);
    }
    if (tickN % 6 === 0) await addEvent(tx, "WEATHER", WEATHER[Math.floor(tickN / 6) % WEATHER.length]);
    if (tickN % 25 === 0) {
      const cut = await tx.telemetryEvent.findMany({ orderBy: { createdAt: "desc" }, skip: 150, take: 1 });
      if (cut[0]) await tx.telemetryEvent.deleteMany({ where: { createdAt: { lte: cut[0].createdAt } } });
    }
    return { ticked: true };
  },

  async SYNC_OFFLINE_QUEUE(tx, user, p) {
    const items = Array.isArray(p.actions) ? (p.actions as { action: string; payload?: Payload }[]) : [];
    const results: { action: string; ok: boolean; error?: string }[] = [];
    for (const it of items.slice(0, 200)) {
      const h = HANDLERS[it.action];
      if (!h || it.action === "SYNC_OFFLINE_QUEUE" || it.action === "RESET_DEMO") {
        results.push({ action: it.action, ok: false, error: "Not syncable" });
        continue;
      }
      try {
        await h(tx, user, it.payload ?? {});
        results.push({ action: it.action, ok: true });
      } catch (e) {
        results.push({ action: it.action, ok: false, error: e instanceof Error ? e.message : "failed" });
      }
    }
    return { applied: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  },
};

export const ACTIONS = Object.keys(HANDLERS);

/** Runs one action in a single atomic transaction and returns the fresh full state. */
export async function runAction(user: SessionUser, action: string, payload: Payload = {}) {
  const h = HANDLERS[action];
  if (!h) throw new Error("unknown action");
  return prisma.$transaction(
    async (tx) => {
      const result = await h(tx, user, payload ?? {});
      return { result, state: await getState(tx) };
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
