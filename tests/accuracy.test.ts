import assert from "node:assert/strict";
import test from "node:test";
import { accuracyOf, weightedUrgency } from "@/lib/accuracy";
import type { Camp } from "@/lib/types";

const camp: Camp = {
  id: "camp-1", name: "Camp One", district: "North", lat: 0, lng: 0, capacity: 100,
  currentOccupancy: 80, status: "STABLE", foodPackets: 100, waterLiters: 100, medicalKits: 10,
  shelterTents: 10, burnRatePerHour: 10, facilitiesJson: "{}",
  verificationJson: JSON.stringify({ baselineFood: 100, elapsedH: 0, groundTruth: 100 }),
};

test("accuracy is 100 when the report, model, and field count agree", () => {
  const accuracy = accuracyOf(camp);
  assert.equal(accuracy.score, 100);
  assert.equal(accuracy.anomaly, false);
  assert.deepEqual(accuracy.checks, { CAMP_LOG: 100, BURN_RATE_MODEL: 100, FIELD_GROUND_TRUTH: 100 });
});

test("accuracy flags a report that materially differs from the burn model", () => {
  const accuracy = accuracyOf({ ...camp, foodPackets: 50 });
  assert.equal(accuracy.anomaly, true);
  assert.equal(accuracy.modelExpected, 100);
});

test("urgency applies the facility penalty and route reliability", () => {
  assert.equal(weightedUrgency(100, { routeReliability: 1, burnDrift: 1, facilityPenalty: 0.25 }, 0), 100);
  assert.equal(weightedUrgency(100, { routeReliability: 0.5, burnDrift: 1, facilityPenalty: 0.25 }, 0.5), 225);
});
