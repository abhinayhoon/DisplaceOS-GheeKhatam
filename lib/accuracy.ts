import type { Camp, Req, Weights } from "@/lib/types";

export type Verif = { baselineFood: number; elapsedH: number; groundTruth: number | null; verifiedAt: string | null; hash: string | null };

export function parseVerif(c: Pick<Camp, "verificationJson" | "foodPackets">): Verif {
  try {
    const j = JSON.parse(c.verificationJson || "{}");
    return {
      baselineFood: typeof j.baselineFood === "number" ? j.baselineFood : c.foodPackets,
      elapsedH: typeof j.elapsedH === "number" ? j.elapsedH : 0,
      groundTruth: typeof j.groundTruth === "number" ? j.groundTruth : null,
      verifiedAt: j.verifiedAt ?? null, hash: j.hash ?? null,
    };
  } catch {
    return { baselineFood: c.foodPackets, elapsedH: 0, groundTruth: null, verifiedAt: null, hash: null };
  }
}

const agree = (a: number, b: number) => 100 - Math.min(100, (Math.abs(a - b) / Math.max(a, b, 100)) * 200);

export type Accuracy = {
  score: number; reported: number; modelExpected: number; groundTruth: number | null; driftPct: number; anomaly: boolean;
  checks: { CAMP_LOG: number; BURN_RATE_MODEL: number; FIELD_GROUND_TRUTH: number | null };
};

/** Headcount x hourly consumption x elapsed hours, against the manual log and the last physical audit. */
export function accuracyOf(c: Camp): Accuracy {
  const v = parseVerif(c);
  const model = Math.max(0, Math.round(v.baselineFood - c.burnRatePerHour * v.elapsedH));
  const reported = c.foodPackets;
  const driftPct = Math.round(((reported - model) / Math.max(model, 100)) * 100);
  const a = agree(reported, model);
  const b = v.groundTruth == null ? 70 : agree(model, v.groundTruth);
  const g = v.groundTruth == null ? 70 : agree(reported, v.groundTruth);
  return {
    score: Math.round((a + b + g) / 3), reported, modelExpected: model, groundTruth: v.groundTruth, driftPct,
    anomaly: Math.abs(driftPct) > 20,
    checks: { CAMP_LOG: Math.round(a), BURN_RATE_MODEL: Math.round(b), FIELD_GROUND_TRUTH: v.groundTruth == null ? null : Math.round(g) },
  };
}

export function requestConfidence(r: Req, c: Camp | undefined) {
  if (!c) return 50;
  let s = accuracyOf(c).score;
  if (r.resourceType === "FOOD" && r.quantityNeeded > c.burnRatePerHour * 48 * 1.5) s -= 25;
  if (r.duplicateFlag) s -= 15;
  return Math.max(0, Math.min(100, s));
}

/** Self-calibrating urgency: base x drift multiplier x (1 + penalty x facility deficit) / route reliability. */
export function weightedUrgency(base: number, w: Pick<Weights, "routeReliability" | "burnDrift" | "facilityPenalty">, facDeficit: number) {
  return Math.round((base * w.burnDrift * (1 + w.facilityPenalty * facDeficit)) / w.routeReliability);
}
