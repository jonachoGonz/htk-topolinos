import { describe, it, expect } from "vitest";
import { computeSkinfoldSum, computeHrZones } from "./evaluations";

describe("computeSkinfoldSum", () => {
  it("sums all provided skinfold measurements", () => {
    expect(
      computeSkinfoldSum({
        bicipital: 10, tricipital: 12, subescapular: 14,
        abdominal: 16, suprailiaco: 8, thigh: 20, leg: 6,
      }),
    ).toBe(86);
  });

  it("ignores missing measurements instead of treating them as zero", () => {
    expect(computeSkinfoldSum({ bicipital: 10, tricipital: 12 })).toBe(22);
  });

  it("returns null when nothing was measured", () => {
    expect(computeSkinfoldSum({})).toBeNull();
    expect(computeSkinfoldSum(null)).toBeNull();
    expect(computeSkinfoldSum(undefined)).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(computeSkinfoldSum({ bicipital: 10.33, tricipital: 12.27 })).toBe(22.6);
  });
});

describe("computeHrZones", () => {
  it("computes the 6 standard training zones from max heart rate", () => {
    expect(computeHrZones(180)).toEqual({
      pct50: 90, pct60: 108, pct70: 126, pct80: 144, pct90: 162, pct100: 180,
    });
  });

  it("returns null for a missing or non-positive max heart rate", () => {
    expect(computeHrZones(null)).toBeNull();
    expect(computeHrZones(undefined)).toBeNull();
    expect(computeHrZones(0)).toBeNull();
    expect(computeHrZones(-5)).toBeNull();
  });
});
