export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface BusinessSummary {
  business_id: string;
  name: string;
  sector: string;
  archetype: string;
  registration_type: string;
}

export interface SubScore {
  label: string;
  score: number | null;
  available: boolean;
  details: Record<string, unknown>;
}

export type SubScoreKey =
  | "revenue_stability"
  | "cash_flow_health"
  | "liquidity"
  | "compliance"
  | "concentration"
  | "invoice_collection"
  | "digital_footprint";

export interface TrendPoint {
  month: string;
  overall_score: number;
}

export interface DataCompleteness {
  gst: boolean;
  upi: boolean;
  bank: boolean;
  epfo: boolean;
}

export interface ScoreResult {
  business_id: string;
  name: string;
  overall_score: number;
  weights_used: Record<string, number>;
  sub_scores: Record<SubScoreKey, SubScore>;
  monthly_trend: TrendPoint[];
  data_completeness: DataCompleteness;
}

export interface Recommendation {
  recommendation: string;
  rationale: string;
}

export interface AnalysisResult {
  business_id: string;
  name: string;
  narrative: string | null;
  strengths: string[] | null;
  risks: string[] | null;
  anomalies: string[] | null;
  recommendations: Recommendation[] | null;
  errors: Record<string, string>;
  cached: boolean;
}

export interface RawGstFiling {
  month: string;
  turnover_reported: number;
  status: string;
}

export interface RawUpiMonthly {
  month: string;
  txn_count: number;
  inflow_amount: number;
  outflow_amount: number;
}

export interface RawBankMonthly {
  month: string;
  closing_balance: number;
  average_balance: number;
  bounced_payments_count: number;
}

/** Subset of GET /api/businesses/{id}/raw -- only the monthly time series the
 * scenario simulator needs (see lib/simulateScore.ts). */
export interface BusinessRawData {
  business_id: string;
  gst: { gstin_registered: boolean; filings: RawGstFiling[] };
  upi: { monthly_summary: RawUpiMonthly[] };
  bank: { monthly_summary: RawBankMonthly[] };
}

export const businessesUrl = () => `${API_URL}/api/businesses`;
export const businessScoreUrl = (id: string) => `${API_URL}/api/businesses/${id}/score`;
export const businessAnalysisUrl = (id: string, forceRefresh = false) =>
  `${API_URL}/api/businesses/${id}/analysis${forceRefresh ? "?force_refresh=true" : ""}`;
export const businessRawUrl = (id: string) => `${API_URL}/api/businesses/${id}/raw`;
