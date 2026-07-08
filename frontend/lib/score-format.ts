import type { SubScoreKey } from "@/lib/api";

export type ScoreBand = "critical" | "warning" | "good";

export function getScoreBand(score: number): ScoreBand {
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "good";
}

export const scoreBandLabel: Record<ScoreBand, string> = {
  critical: "At Risk",
  warning: "Moderate",
  good: "Strong",
};

export const scoreBandClasses: Record<ScoreBand, { text: string; bg: string; softBg: string; border: string }> = {
  critical: {
    text: "text-status-critical",
    bg: "bg-status-critical",
    softBg: "bg-status-critical/10",
    border: "border-status-critical/30",
  },
  warning: {
    text: "text-status-warning",
    bg: "bg-status-warning",
    softBg: "bg-status-warning/10",
    border: "border-status-warning/30",
  },
  good: {
    text: "text-status-good",
    bg: "bg-status-good",
    softBg: "bg-status-good/10",
    border: "border-status-good/30",
  },
};

export const SUB_SCORE_ORDER: SubScoreKey[] = [
  "revenue_stability",
  "cash_flow_health",
  "liquidity",
  "compliance",
  "concentration",
  "invoice_collection",
  "digital_footprint",
];

export const SUB_SCORE_SHORT_LABEL: Record<SubScoreKey, string> = {
  revenue_stability: "Revenue",
  cash_flow_health: "Cash Flow",
  liquidity: "Liquidity",
  compliance: "Compliance",
  concentration: "Concentration",
  invoice_collection: "Collections",
  digital_footprint: "Digital Footprint",
};

export const ARCHETYPE_LABEL: Record<string, string> = {
  thin_file_strong_cashflow: "Thin-File, Cash-Flow Strong",
  declining_on_paper: "Formally Healthy, Quietly Declining",
  stable: "Stable",
  growing: "Growing",
  volatile_seasonal: "Seasonal / Volatile",
};

export type ArchetypeGroup = "thin_file" | "declining" | "other";

export const ARCHETYPE_GROUP: Record<string, ArchetypeGroup> = {
  thin_file_strong_cashflow: "thin_file",
  declining_on_paper: "declining",
  stable: "other",
  growing: "other",
  volatile_seasonal: "other",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(month: string): string {
  const parts = month.split("-");
  const m = parseInt(parts[1] ?? "", 10);
  return MONTH_NAMES[m - 1] ?? month;
}
