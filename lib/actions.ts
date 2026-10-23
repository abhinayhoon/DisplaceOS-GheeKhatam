"use server";

import { prisma } from "@/lib/prisma";

type ResourceType = "FOOD" | "WATER" | "MEDICINE" | "SHELTER" | "EVACUATION";
type RouteStatus = "CLEAR" | "LANDSLIDE_DETOUR" | "DELIVERED";

const CAMP_FIELD: Record<string, "foodPackets" | "waterLiters" | "medicalKits" | "shelterTents" | undefined> = {
  FOOD: "foodPackets",
  WATER: "waterLiters",
  MEDICINE: "medicalKits",
  SHELTER: "shelterTents",
};

export async function getLiveState() {
  const [camps, requests, depots, dispatches, people] = await Promise.all([
    prisma.reliefCamp.findMany({ orderBy: { name: "asc" } }),
    prisma.resourceRequest.findMany({ orderBy: { urgencyScore: "desc" } }),
    prisma.supplyDepot.findMany({ orderBy: { name: "asc" } }),
    prisma.rescueDispatch.findMany({ orderBy: { unitCode: "asc" } }),
    prisma.displacedPerson.findMany({ orderBy: { fullName: "asc" } }),
  ]);
  return { camps, requests, depots, dispatches, people };
}

export async function rebalanceSurplus() {
  const alpha = await prisma.reliefCamp.findFirst({ where: { name: "Camp Alpha" } });
  const delta = await prisma.reliefCamp.findFirst({ where: { name: "Camp Delta" } });
  const gamma = await prisma.reliefCamp.findFirst({ where: { name: "Camp Gamma" } });
  const depot = await prisma.supplyDepot.findFirst({ where: { name: "Chamoli Depot" } });
  const moved: { food: number; medicine: number } = { food: 0, medicine: 0 };

  if (alpha && delta) {
    const keep = alpha.currentOccupancy * 2;
    const food = Math.max(0, Math.min(alpha.foodPackets - keep, 1500));
    if (food > 0) {
      await prisma.$transaction([
        prisma.reliefCamp.update({ where: { id: alpha.id }, data: { foodPackets: { decrement: food }, status: "STABLE" } }),
        prisma.rescueDispatch.create({
          data: {
            teamName: "Auto-Rebalance Convoy", unitCode: `RB-F-${Date.now() % 100000}`, vehicleType: "HEAVY_TRUCK",
            originName: alpha.name, targetCampId: delta.id, targetCampName: delta.name, resourceType: "FOOD",
            quantity: food, etaMinutes: 60, routeStatus: "CLEAR", progressPercent: 0,
          },
        }),
        prisma.resourceRequest.updateMany({
          where: { campId: delta.id, resourceType: "FOOD", status: "PENDING" },
          data: { status: "IN_TRANSIT" },
        }),
        prisma.resourceRequest.updateMany({
          where: { campId: alpha.id, resourceType: "FOOD", duplicateFlag: true, status: { not: "DELIVERED" } },
          data: { status: "DELIVERED" },
        }),
      ]);
      moved.food = food;
    }
  }

  if (depot && gamma) {
    const kits = Math.min(depot.medicineStock, 300);
    if (kits > 0) {
      await prisma.$transaction([
        prisma.supplyDepot.update({ where: { id: depot.id }, data: { medicineStock: { decrement: kits } } }),
        prisma.rescueDispatch.create({
          data: {
            teamName: "Medical Airlift", unitCode: `RB-M-${Date.now() % 100000}`, vehicleType: "HELI_AIRLIFT",
            originName: depot.name, targetCampId: gamma.id, targetCampName: gamma.name, resourceType: "MEDICINE",
            quantity: kits, etaMinutes: 50, routeStatus: "CLEAR", progressPercent: 0,
          },
        }),
        prisma.resourceRequest.updateMany({
          where: { campId: gamma.id, resourceType: "MEDICINE", status: "PENDING" },
          data: { status: "IN_TRANSIT" },
        }),
      ]);
      moved.medicine = kits;
    }
  }
  return moved;
}

export async function simulateFlashFlood() {
  const camps = await prisma.reliefCamp.findMany();
  const target = camps.find((c) => c.name === "Camp Beta") ?? camps[0];
  if (!target) return null;
  const influx = 120;
  const occupancy = target.currentOccupancy + influx;
  const deficit = 600;
  const runway = 3;
  const score = Math.round((occupancy * deficit) / runway);

  const [camp, request, dispatch] = await prisma.$transaction([
    prisma.reliefCamp.update({
      where: { id: target.id },
      data: { currentOccupancy: occupancy, status: occupancy > target.capacity ? "OVERFLOW" : "CRITICAL" },
    }),
    prisma.resourceRequest.create({
      data: {
        campId: target.id, campName: target.name, district: target.district, resourceType: "EVACUATION",
        quantityNeeded: influx, urgencyScore: score, status: "PENDING", duplicateFlag: false,
        reasoningJson: JSON.stringify({
          event: "Flash flood + landslide SOS", occupancy, deficit, runwayHours: runway,
          formula: "(occupancy x deficit) / runwayHours", score,
        }),
      },
    }),
    prisma.rescueDispatch.create({
      data: {
        teamName: "NDRF Rapid Response", unitCode: `NDRF-${Date.now() % 1000}`, vehicleType: "NDRF_BOAT",
        originName: "Dehradun Central Depot", targetCampId: target.id, targetCampName: target.name,
        resourceType: "EVACUATION", quantity: influx, etaMinutes: 35, routeStatus: "LANDSLIDE_DETOUR", progressPercent: 5,
      },
    }),
  ]);
  return { camp, request, dispatch };
}

export async function createResourceRequest(input: {
  campId: string;
  resourceType: ResourceType;
  quantityNeeded: number;
  runwayHours?: number;
}) {
  const camp = await prisma.reliefCamp.findUnique({ where: { id: input.campId } });
  if (!camp) throw new Error("Camp not found");

  const field = CAMP_FIELD[input.resourceType];
  const stock = field ? camp[field] : 0;
  const deficit = Math.max(0, input.quantityNeeded - stock);
  const runwayHours =
    input.runwayHours ?? (field && camp.burnRatePerHour > 0 ? Math.max(0.5, stock / camp.burnRatePerHour) : 1);
  const urgencyScore = Math.round((camp.currentOccupancy * deficit) / Math.max(runwayHours, 0.5));

  const dup = await prisma.resourceRequest.findFirst({
    where: { campId: camp.id, resourceType: input.resourceType, status: { in: ["PENDING", "ALLOCATED", "IN_TRANSIT"] } },
  });

  return prisma.resourceRequest.create({
    data: {
      campId: camp.id, campName: camp.name, district: camp.district, resourceType: input.resourceType,
      quantityNeeded: input.quantityNeeded, urgencyScore, status: "PENDING", duplicateFlag: !!dup,
      reasoningJson: JSON.stringify({
        occupancy: camp.currentOccupancy, deficit, runwayHours,
        formula: "(occupancy x deficit) / runwayHours",
        duplicateOf: dup?.id ?? null,
      }),
    },
  });
}

export async function updateDispatchStatus(id: string, routeStatus: RouteStatus) {
  const d = await prisma.rescueDispatch.findUnique({ where: { id } });
  if (!d) throw new Error("Dispatch not found");
  if (routeStatus !== "DELIVERED") {
    return prisma.rescueDispatch.update({ where: { id }, data: { routeStatus } });
  }
  if (d.routeStatus === "DELIVERED") return d;

  const field = CAMP_FIELD[d.resourceType];
  const ops = [
    prisma.rescueDispatch.update({ where: { id }, data: { routeStatus, progressPercent: 100, etaMinutes: 0 } }),
    prisma.resourceRequest.updateMany({
      where: { campId: d.targetCampId, resourceType: d.resourceType, status: { in: ["ALLOCATED", "IN_TRANSIT"] } },
      data: { status: "DELIVERED" },
    }),
  ];
  if (field) {
    ops.push(
      prisma.reliefCamp.update({
        where: { id: d.targetCampId },
        data: { [field]: { increment: d.quantity }, status: "STABLE" },
      }) as never,
    );
  }
  await prisma.$transaction(ops);
  return prisma.rescueDispatch.findUnique({ where: { id } });
}

export async function upsertDisplacedPerson(input: {
  id?: string;
  fullName: string;
  age: number;
  medicalNeeds?: string;
  currentCampName: string;
  district: string;
  familyGroupCode: string;
  status?: "SAFE_IN_CAMP" | "NEEDS_MEDEVAC" | "REUNITED";
}) {
  const data = {
    fullName: input.fullName, age: input.age, medicalNeeds: input.medicalNeeds ?? "None",
    currentCampName: input.currentCampName, district: input.district,
    familyGroupCode: input.familyGroupCode, status: input.status ?? "SAFE_IN_CAMP",
  };
  return input.id
    ? prisma.displacedPerson.update({ where: { id: input.id }, data })
    : prisma.displacedPerson.create({ data });
}
