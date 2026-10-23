import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
const db = new PrismaClient();

async function main() {
  await db.rescueDispatch.deleteMany();
  await db.resourceRequest.deleteMany();
  await db.displacedPerson.deleteMany();
  await db.supplyDepot.deleteMany();
  await db.reliefCamp.deleteMany();

  const mk = (d: any) => db.reliefCamp.create({ data: d });
  const alpha = await mk({ name: "Camp Alpha", district: "Uttarkashi", lat: 30.7268, lng: 78.4354, capacity: 500, currentOccupancy: 410, status: "OVERFLOW", foodPackets: 2200, waterLiters: 6000, medicalKits: 80, shelterTents: 120, burnRatePerHour: 100 });
  const beta = await mk({ name: "Camp Beta", district: "Uttarkashi", lat: 30.7512, lng: 78.4921, capacity: 400, currentOccupancy: 280, status: "STABLE", foodPackets: 1400, waterLiters: 4200, medicalKits: 60, shelterTents: 90, burnRatePerHour: 70 });
  const gamma = await mk({ name: "Camp Gamma", district: "Rudraprayag", lat: 30.2844, lng: 78.9811, capacity: 350, currentOccupancy: 330, status: "CRITICAL", foodPackets: 900, waterLiters: 2500, medicalKits: 0, shelterTents: 60, burnRatePerHour: 60 });
  const delta = await mk({ name: "Camp Delta", district: "Chamoli", lat: 30.4048, lng: 79.3197, capacity: 300, currentOccupancy: 290, status: "CRITICAL", foodPackets: 0, waterLiters: 300, medicalKits: 10, shelterTents: 40, burnRatePerHour: 116 });
  const epsilon = await mk({ name: "Camp Epsilon", district: "Tehri", lat: 30.378, lng: 78.4803, capacity: 450, currentOccupancy: 300, status: "STABLE", foodPackets: 1800, waterLiters: 5000, medicalKits: 70, shelterTents: 100, burnRatePerHour: 75 });
  const zeta = await mk({ name: "Camp Zeta", district: "Tehri", lat: 30.3903, lng: 78.5, capacity: 250, currentOccupancy: 120, status: "STABLE", foodPackets: 800, waterLiters: 2000, medicalKits: 40, shelterTents: 50, burnRatePerHour: 35 });

  await db.supplyDepot.createMany({ data: [
    { name: "Chamoli Depot", district: "Chamoli", foodStock: 3000, waterStock: 9000, medicineStock: 500, shelterStock: 200 },
    { name: "Dehradun Central Depot", district: "Dehradun", foodStock: 8000, waterStock: 20000, medicineStock: 300, shelterStock: 500 },
    { name: "Tehri Depot", district: "Tehri", foodStock: 1500, waterStock: 4000, medicineStock: 90, shelterStock: 100 },
  ]});

  const r = (c: any, resourceType: string, quantityNeeded: number, urgencyScore: number, status: string, duplicateFlag: boolean, reasoning: any) =>
    ({ campId: c.id, campName: c.name, district: c.district, resourceType, quantityNeeded, urgencyScore, status, duplicateFlag, reasoningJson: JSON.stringify(reasoning) });
  await db.resourceRequest.createMany({ data: [
    r(delta, "FOOD", 1500, 9800, "PENDING", false, { occupancy: 290, deficit: 1500, runwayHours: 2.5, formula: "(290 x 1500) / 2.5 scaled", note: "Zero food, 2.5h runway" }),
    r(gamma, "MEDICINE", 300, 8200, "PENDING", false, { occupancy: 330, deficit: 300, runwayHours: 4, note: "Zero medical kits, insulin shortage" }),
    r(alpha, "FOOD", 1000, 120, "DELIVERED", true, { occupancy: 410, deficit: 0, runwayHours: 22, note: "Duplicate shipment of delivered request" }),
    r(alpha, "FOOD", 1000, 110, "IN_TRANSIT", true, { occupancy: 410, deficit: 0, runwayHours: 22, note: "Second duplicate, 220% surplus" }),
    r(delta, "WATER", 2000, 6100, "PENDING", false, { occupancy: 290, deficit: 2000, runwayHours: 6, note: "Water at 300L" }),
    r(gamma, "SHELTER", 80, 2400, "ALLOCATED", false, { occupancy: 330, deficit: 80, runwayHours: 24, note: "Tent shortage" }),
    r(beta, "EVACUATION", 25, 3100, "PENDING", false, { occupancy: 280, deficit: 25, runwayHours: 12, note: "Medevac required" }),
    r(epsilon, "WATER", 500, 900, "DELIVERED", true, { occupancy: 300, deficit: 0, runwayHours: 40, note: "Duplicate water order" }),
  ]});

  await db.rescueDispatch.createMany({ data: [
    { teamName: "NDRF Bravo", unitCode: "NDRF-07", vehicleType: "NDRF_BOAT", originName: "Dehradun Central Depot", targetCampId: beta.id, targetCampName: beta.name, resourceType: "EVACUATION", quantity: 25, etaMinutes: 45, routeStatus: "CLEAR", progressPercent: 40 },
    { teamName: "IAF Rotor", unitCode: "HELI-02", vehicleType: "HELI_AIRLIFT", originName: "Dehradun Central Depot", targetCampId: delta.id, targetCampName: delta.name, resourceType: "FOOD", quantity: 600, etaMinutes: 70, routeStatus: "CLEAR", progressPercent: 25 },
    { teamName: "Road Convoy 3", unitCode: "TRK-11", vehicleType: "HEAVY_TRUCK", originName: "Tehri Depot", targetCampId: gamma.id, targetCampName: gamma.name, resourceType: "SHELTER", quantity: 80, etaMinutes: 180, routeStatus: "LANDSLIDE_DETOUR", progressPercent: 55 },
    { teamName: "Road Convoy 5", unitCode: "TRK-14", vehicleType: "HEAVY_TRUCK", originName: "Chamoli Depot", targetCampId: epsilon.id, targetCampName: epsilon.name, resourceType: "WATER", quantity: 500, etaMinutes: 0, routeStatus: "DELIVERED", progressPercent: 100 },
    { teamName: "NDRF Charlie", unitCode: "NDRF-09", vehicleType: "NDRF_BOAT", originName: "Camp Zeta", targetCampId: zeta.id, targetCampName: zeta.name, resourceType: "MEDICINE", quantity: 40, etaMinutes: 90, routeStatus: "CLEAR", progressPercent: 10 },
  ]});

  const p = (fullName: string, age: number, medicalNeeds: string, c: any, familyGroupCode: string, status: string) =>
    ({ fullName, age, medicalNeeds, currentCampName: c.name, district: c.district, familyGroupCode, status });
  await db.displacedPerson.createMany({ data: [
    p("Ramesh Rawat", 62, "Insulin-dependent diabetes", gamma, "FAM-101", "NEEDS_MEDEVAC"),
    p("Sunita Rawat", 58, "None", gamma, "FAM-101", "SAFE_IN_CAMP"),
    p("Anil Negi", 34, "None", delta, "FAM-102", "SAFE_IN_CAMP"),
    p("Meena Negi", 31, "Pregnancy, 8 months", delta, "FAM-102", "NEEDS_MEDEVAC"),
    p("Aarav Negi", 4, "Malnutrition risk", delta, "FAM-102", "SAFE_IN_CAMP"),
    p("Kamla Devi", 74, "Hypertension", alpha, "FAM-103", "SAFE_IN_CAMP"),
    p("Vikram Bisht", 45, "Fractured leg", beta, "FAM-104", "NEEDS_MEDEVAC"),
    p("Priya Bisht", 12, "None", beta, "FAM-104", "SAFE_IN_CAMP"),
    p("Mohan Panwar", 67, "Asthma", epsilon, "FAM-105", "REUNITED"),
    p("Geeta Panwar", 63, "None", epsilon, "FAM-105", "REUNITED"),
    p("Suresh Chauhan", 29, "None", zeta, "FAM-106", "SAFE_IN_CAMP"),
    p("Lata Chauhan", 3, "Dehydration", zeta, "FAM-106", "SAFE_IN_CAMP"),
  ]});

  const hash = await hashPassword("Demo@12345");
  const demo: [string, string, string, string | null][] = [
    ["gov@displaceos.demo", "Gov Command (NDMA)", "GOV_AGENCY", null],
    ["camp@displaceos.demo", "Camp Manager (Delta)", "RELIEF_CAMP", delta.id],
    ["rescue@displaceos.demo", "NDRF Field Unit", "RESCUE_TEAM", null],
  ];
  for (const [email, name, role, campId] of demo) {
    const u = await db.user.upsert({ where: { email }, update: { name, role, campId, emailVerified: true }, create: { email, name, role, campId, emailVerified: true } });
    const a = await db.account.findFirst({ where: { userId: u.id, providerId: "credential" } });
    if (a) await db.account.update({ where: { id: a.id }, data: { password: hash } });
    else await db.account.create({ data: { accountId: u.id, providerId: "credential", userId: u.id, password: hash } });
  }
}
main().finally(() => db.$disconnect());
