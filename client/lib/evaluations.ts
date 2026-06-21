/**
 * Pure types and helpers for the monthly student evaluation
 * (body_evaluations table). Deliberately has zero imports from
 * services/supabase so it can be unit-tested without a Supabase client.
 */

export type HabitLevel4 = "no" | "a_veces" | "a_menudo" | "siempre";
export type QualityLevel4 = "malo" | "regular" | "bueno" | "excelente";

export const HABIT_LEVEL_OPTIONS: Array<[HabitLevel4, string]> = [
  ["no", "No"],
  ["a_veces", "A veces"],
  ["a_menudo", "A menudo"],
  ["siempre", "Siempre"],
];

export const QUALITY_LEVEL_OPTIONS: Array<[QualityLevel4, string]> = [
  ["malo", "Malo"],
  ["regular", "Regular"],
  ["bueno", "Bueno"],
  ["excelente", "Excelente"],
];

export interface Skinfolds {
  bicipital?: number;
  tricipital?: number;
  subescapular?: number;
  abdominal?: number;
  suprailiaco?: number;
  thigh?: number;
  leg?: number;
}

export interface Habits {
  smoking?: { level: HabitLevel4; count?: number };
  alcohol?: { level: HabitLevel4; count?: number };
  physical_activity?: { level: HabitLevel4; count?: number };
  nutrition?: { level: QualityLevel4 };
  hydration?: { level: QualityLevel4 };
  rest?: { level: QualityLevel4; hours?: number };
}

export interface MaxHrZones {
  pct50?: number;
  pct60?: number;
  pct70?: number;
  pct80?: number;
  pct90?: number;
  pct100?: number;
}

export interface PainAssessment {
  onset?: string;
  location?: string;
  radiation?: string;
  character?: string;
  intensity_0_10?: number;
  aggravating?: string;
}

export interface EvaluationObjectives {
  specific_1?: string;
  specific_2?: string;
  specific_3?: string;
  general?: string;
}

/** Sum of all provided skinfold measurements (Jackson-Pollock style), rounded to 1 decimal. */
export function computeSkinfoldSum(skinfolds?: Skinfolds | null): number | null {
  if (!skinfolds) return null;
  const values = [
    skinfolds.bicipital, skinfolds.tricipital, skinfolds.subescapular,
    skinfolds.abdominal, skinfolds.suprailiaco, skinfolds.thigh, skinfolds.leg,
  ].filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum * 10) / 10;
}

/** Standard 6-zone training heart rate table from a max heart rate value. */
export function computeHrZones(maxHr?: number | null): MaxHrZones | null {
  if (!maxHr || maxHr <= 0) return null;
  const pct = (p: number) => Math.round(maxHr * (p / 100));
  return {
    pct50: pct(50), pct60: pct(60), pct70: pct(70),
    pct80: pct(80), pct90: pct(90), pct100: pct(100),
  };
}
