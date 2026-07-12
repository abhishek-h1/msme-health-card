/**
 * Client-side scenario simulator: recomputes the sub-scores that a revenue
 * change, expense change, or "top customer stops paying" event would plausibly
 * move, so the dashboard can update live as the user drags a slider instead of
 * round-tripping to the backend on every change.
 *
 * This is a SIMPLIFIED port of backend/engine/scoring.py -- see that file for
 * the authoritative formulas. Two deliberate simplifications:
 *
 * 1. Revenue/expense changes are applied to the trailing 3 months only (a
 *    "going forward" shock), not uniformly to the whole 12-month window.
 *    Revenue Stability and Cash Flow Health are trend/consistency metrics,
 *    which are scale-invariant under a uniform multiplier -- rescaling every
 *    month by the same factor would leave those scores completely unchanged,
 *    which reads as broken even though it's mathematically "correct". Shocking
 *    only the recent months produces a real, intuitive trend shift.
 * 2. "Top customer stops paying" approximates the single largest counterparty
 *    as ~40% of the concentration sub-score's synthesized top-3 combined share
 *    (see engine/scoring.py's score_concentration) and applies that cut to
 *    trailing-quarter inflow, plus a fixed bump to bounced-payment counts
 *    (a major default is a textbook trigger for missed obligations).
 *
 * Compliance, concentration, and digital footprint are structural/formal-record
 * scores this simulator doesn't touch -- they pass through unchanged from the
 * baseline, exactly like the backend's reweighting treats any sub-score that
 * has nothing new to say.
 */

import type { BusinessRawData, ScoreResult, SubScore, SubScoreKey } from "./api";

export interface RawFinancialSummary {
  gstTurnover: number[];
  upiInflow: number[];
  upiOutflow: number[];
  bankAvgBalance: number[];
  bankBouncedCount: number[];
  /** Approximate combined share of the top 3 UPI counterparties, 0-1. */
  top3CounterpartyShare: number;
}

export interface ScenarioInputs {
  revenueChangePct: number;
  expenseChangePct: number;
  topCustomerLost: boolean;
}

export interface SimulationResult {
  overallScore: number;
  subScores: Record<SubScoreKey, SubScore>;
}

const DEFAULT_WEIGHTS: Record<SubScoreKey, number> = {
  revenue_stability: 0.2,
  cash_flow_health: 0.2,
  liquidity: 0.15,
  compliance: 0.15,
  concentration: 0.1,
  invoice_collection: 0.1,
  digital_footprint: 0.1,
};

const TRAILING_MONTHS = 3;

function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, value));
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  return denominator ? numerator / denominator : fallback;
}

/** Ported from scoring.py's trend_and_consistency(). */
function trendAndConsistency(values: number[]): { consistencyScore: number; trendScore: number } {
  const n = values.length;
  if (n === 0) return { consistencyScore: 50, trendScore: 50 };
  if (n === 1) return { consistencyScore: 60, trendScore: 50 };

  const m = mean(values);
  const cv = safeDiv(stddev(values), m);
  const consistencyScore = clamp(100 - cv * 150);

  const half = Math.floor(n / 2);
  const meanFirst = mean(values.slice(0, half));
  const meanSecond = mean(values.slice(half));
  const trendPct = safeDiv(meanSecond - meanFirst, meanFirst);
  const trendScore = clamp(50 + trendPct * 100);

  return { consistencyScore, trendScore };
}

function applyToTrailingMonths(series: number[], multiplier: number, months = TRAILING_MONTHS): number[] {
  const start = Math.max(0, series.length - months);
  return series.map((v, i) => (i >= start ? v * multiplier : v));
}

function bumpTrailingMonths(series: number[], amount: number, months = TRAILING_MONTHS): number[] {
  const start = Math.max(0, series.length - months);
  return series.map((v, i) => (i >= start ? v + amount : v));
}

/** Ported from scoring.py's score_revenue_stability(). */
function scoreRevenueStability(series: number[]): number {
  const { consistencyScore, trendScore } = trendAndConsistency(series);
  return clamp(0.5 * trendScore + 0.5 * consistencyScore);
}

/** Ported from scoring.py's score_cash_flow_health(). */
function scoreCashFlowHealth(inflow: number[], outflow: number[]): number {
  const ratios = inflow.map((inf, i) => {
    const out = outflow[i] ?? 0;
    if (out > 0) return Math.min(inf / out, 3);
    return inf > 0 ? 3 : 1;
  });
  const { consistencyScore, trendScore } = trendAndConsistency(ratios);
  const levelScore = clamp(50 + (mean(ratios) - 1) * 100);
  return clamp(0.5 * levelScore + 0.3 * consistencyScore + 0.2 * trendScore);
}

/** Ported from scoring.py's score_liquidity(). */
function scoreLiquidity(avgBalance: number[], monthlyExpense: number[]): number {
  const bufferMonths = avgBalance.map((bal, i) => safeDiv(bal, monthlyExpense[i] ?? 0, 3));
  const { trendScore } = trendAndConsistency(bufferMonths);
  const levelScore = clamp(mean(bufferMonths) * 40);
  return clamp(0.6 * levelScore + 0.4 * trendScore);
}

/** Ported from scoring.py's score_invoice_collection(). */
function scoreInvoiceCollection(bounceCounts: number[]): number {
  const avgBounces = mean(bounceCounts);
  const n = bounceCounts.length;
  const recentCut = Math.max(1, n - Math.max(1, Math.floor(n / 3)));
  const recentSlice = bounceCounts.slice(recentCut);
  const recentAvg = recentSlice.length ? mean(recentSlice) : avgBounces;
  const weightedBounces = 0.4 * avgBounces + 0.6 * recentAvg;
  return clamp(100 - weightedBounces * 25);
}

/** Ported from scoring.py's compute_overall() reweighting logic: unavailable
 * sub-scores are dropped, not scored as 0, and remaining weights renormalize. */
function computeOverall(subScores: Record<SubScoreKey, SubScore>): number {
  const keys = Object.keys(subScores) as SubScoreKey[];
  const available = keys.filter((k) => subScores[k].available);
  const totalWeight = available.reduce((sum, k) => sum + DEFAULT_WEIGHTS[k], 0);
  if (totalWeight === 0) return 0;
  const overall = available.reduce(
    (sum, k) => sum + (subScores[k].score ?? 0) * (DEFAULT_WEIGHTS[k] / totalWeight),
    0
  );
  return Math.round(clamp(overall) * 100) / 100;
}

export function buildFinancialSummary(raw: BusinessRawData, scoreResult: ScoreResult): RawFinancialSummary {
  const concentrationDetails = scoreResult.sub_scores.concentration.details;
  const rawShare = concentrationDetails?.top3_counterparty_share;

  return {
    gstTurnover: raw.gst.filings.map((f) => f.turnover_reported),
    upiInflow: raw.upi.monthly_summary.map((m) => m.inflow_amount),
    upiOutflow: raw.upi.monthly_summary.map((m) => m.outflow_amount),
    bankAvgBalance: raw.bank.monthly_summary.map((m) => m.average_balance),
    bankBouncedCount: raw.bank.monthly_summary.map((m) => m.bounced_payments_count),
    top3CounterpartyShare: typeof rawShare === "number" ? rawShare : 0.3,
  };
}

export function simulateScenario(
  baseline: ScoreResult,
  financials: RawFinancialSummary,
  inputs: ScenarioInputs
): SimulationResult {
  const revenueMultiplier = 1 + inputs.revenueChangePct / 100;
  const expenseMultiplier = 1 + inputs.expenseChangePct / 100;

  let adjustedTurnover = applyToTrailingMonths(financials.gstTurnover, revenueMultiplier);
  let adjustedInflow = applyToTrailingMonths(financials.upiInflow, revenueMultiplier);
  const adjustedOutflow = applyToTrailingMonths(financials.upiOutflow, expenseMultiplier);
  let adjustedBounces = financials.bankBouncedCount;

  if (inputs.topCustomerLost) {
    // Approximate the single largest counterparty as ~40% of the top-3
    // combined share -- a rough but explainable stand-in for real
    // counterparty-level data (see the concentration sub-score's own
    // ASSUMPTION note in scoring.py).
    const topCustomerShare = clamp(financials.top3CounterpartyShare * 0.4, 0, 1);
    adjustedTurnover = applyToTrailingMonths(adjustedTurnover, 1 - topCustomerShare);
    adjustedInflow = applyToTrailingMonths(adjustedInflow, 1 - topCustomerShare);
    adjustedBounces = bumpTrailingMonths(adjustedBounces, 2);
  }

  // Extra or lost cash flow accumulates into the balance -- a simplified
  // stand-in for the backend's random-walk balance simulation, which isn't
  // reproducible client-side without the full daily series.
  let cumulativeDelta = 0;
  const adjustedBalance = financials.bankAvgBalance.map((balance, i) => {
    const netDelta = adjustedInflow[i] - financials.upiInflow[i] - (adjustedOutflow[i] - financials.upiOutflow[i]);
    cumulativeDelta += netDelta;
    return balance + cumulativeDelta;
  });

  const revenueSeries = adjustedTurnover.length >= 6 ? adjustedTurnover : adjustedInflow;

  const recomputed: Partial<Record<SubScoreKey, number>> = {
    revenue_stability: scoreRevenueStability(revenueSeries),
    cash_flow_health: scoreCashFlowHealth(adjustedInflow, adjustedOutflow),
    liquidity: scoreLiquidity(adjustedBalance, adjustedOutflow),
    invoice_collection: scoreInvoiceCollection(adjustedBounces),
  };

  const subScores = { ...baseline.sub_scores };
  for (const key of Object.keys(recomputed) as SubScoreKey[]) {
    const baseSub = baseline.sub_scores[key];
    if (baseSub.available) {
      subScores[key] = { ...baseSub, score: recomputed[key]! };
    }
  }

  return { overallScore: computeOverall(subScores), subScores };
}

export function describeScenario(inputs: ScenarioInputs, baselineScore: number, simulatedScore: number): string {
  const parts: string[] = [];
  if (inputs.revenueChangePct !== 0) {
    parts.push(`revenue ${inputs.revenueChangePct > 0 ? "grows" : "falls"} ${Math.abs(inputs.revenueChangePct)}%`);
  }
  if (inputs.expenseChangePct !== 0) {
    parts.push(`expenses ${inputs.expenseChangePct > 0 ? "rise" : "fall"} ${Math.abs(inputs.expenseChangePct)}%`);
  }
  if (inputs.topCustomerLost) {
    parts.push("the top customer stops paying");
  }

  if (parts.length === 0) {
    return "Adjust the controls above to simulate a scenario.";
  }

  const scenario =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  const direction =
    simulatedScore > baselineScore ? "rise" : simulatedScore < baselineScore ? "fall" : "stay roughly flat";

  return `Simulated: if ${scenario}, this business's score would ${direction} from ${Math.round(
    baselineScore
  )} to ${Math.round(simulatedScore)}.`;
}
