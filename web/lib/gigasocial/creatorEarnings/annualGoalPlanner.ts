/**
 * GH₵ annual earnings goal planner — aspiration math only.
 * Never invent earnings rates; use verified totals + user-entered assumptions.
 */

export const DEFAULT_ANNUAL_ASPIRATION_GHS = 100_000;
export const DAYS_PER_YEAR = 365;
export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

export function annualTargetBreakdown(annualTargetGhs: number): {
  perMonth: number;
  perWeek: number;
  perDay: number;
} {
  const target = Math.max(0, annualTargetGhs);
  return {
    perMonth: target / MONTHS_PER_YEAR,
    perWeek: target / WEEKS_PER_YEAR,
    perDay: target / DAYS_PER_YEAR,
  };
}

export type GoalProgressInput = {
  annualTargetGhs: number;
  verifiedYtdGhs: number;
  /** Calendar day of year 1–365/366, or days elapsed in the creator's chosen year window. */
  daysElapsedInPeriod: number;
  daysInPeriod?: number;
};

export type GoalProgress = {
  annualTargetGhs: number;
  verifiedYtdGhs: number;
  remainingGhs: number;
  percentReached: number;
  averageDailySoFar: number | null;
  averageMonthlySoFar: number | null;
  requiredAverageDailyRemaining: number | null;
  requiredAverageMonthlyRemaining: number | null;
  reliableProjection: boolean;
  projectionNote: string;
};

export function computeGoalProgress(input: GoalProgressInput): GoalProgress {
  const annualTargetGhs = Math.max(0, input.annualTargetGhs);
  const verifiedYtdGhs = Math.max(0, input.verifiedYtdGhs);
  const daysInPeriod = Math.max(1, input.daysInPeriod ?? DAYS_PER_YEAR);
  const daysElapsed = Math.min(daysInPeriod, Math.max(0, Math.floor(input.daysElapsedInPeriod)));
  const remainingGhs = Math.max(0, annualTargetGhs - verifiedYtdGhs);
  const percentReached =
    annualTargetGhs <= 0 ? 0 : Math.min(100, (verifiedYtdGhs / annualTargetGhs) * 100);

  const reliableProjection = daysElapsed >= 28 && verifiedYtdGhs > 0;
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

  const averageDailySoFar = daysElapsed > 0 ? verifiedYtdGhs / daysElapsed : null;
  const averageMonthlySoFar =
    daysElapsed > 0 ? verifiedYtdGhs / (daysElapsed / (daysInPeriod / MONTHS_PER_YEAR)) : null;

  let requiredAverageDailyRemaining: number | null = null;
  let requiredAverageMonthlyRemaining: number | null = null;
  if (daysRemaining > 0) {
    requiredAverageDailyRemaining = remainingGhs / daysRemaining;
    requiredAverageMonthlyRemaining =
      remainingGhs / Math.max(1 / MONTHS_PER_YEAR, daysRemaining / (daysInPeriod / MONTHS_PER_YEAR));
  }

  const projectionNote = reliableProjection
    ? "Projection uses your verified year-to-date earnings only. Past results do not guarantee future income."
    : "Not enough verified history yet for a reliable projection (need at least 28 days and some verified earnings).";

  return {
    annualTargetGhs,
    verifiedYtdGhs,
    remainingGhs,
    percentReached,
    averageDailySoFar,
    averageMonthlySoFar,
    requiredAverageDailyRemaining,
    requiredAverageMonthlyRemaining,
    reliableProjection,
    projectionNote,
  };
}

/** Transparent scenario math from user-entered monthly assumptions (estimates, not promises). */
export function sumScenarioAnnual(monthlyBySourceGhs: Record<string, number>): {
  monthlyTotal: number;
  annualTotal: number;
} {
  let monthlyTotal = 0;
  for (const value of Object.values(monthlyBySourceGhs)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      monthlyTotal += value;
    }
  }
  return { monthlyTotal, annualTotal: monthlyTotal * MONTHS_PER_YEAR };
}
