"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import { CardTitleIcon } from "@/components/card-title-icon";
import { SubScoreRadar } from "@/components/sub-score-radar";
import { businessRawUrl, type BusinessRawData, type ScoreResult } from "@/lib/api";
import { buildFinancialSummary, describeScenario, simulateScenario } from "@/lib/simulateScore";
import { useApiFetch } from "@/lib/use-fetch";

const REVENUE_MIN = -30;
const REVENUE_MAX = 50;
const EXPENSE_MIN = -20;
const EXPENSE_MAX = 30;

function formatPct(pct: number) {
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/**
 * Base UI's Slider is controlled with an array value here (so exactly one
 * thumb renders -- see components/ui/slider.tsx), but its internal collision
 * logic treats a single-element array as "not really a range" and hands
 * onValueChange a bare number during pointer drags while still passing an
 * array during keyboard/native-input interactions. Handle both shapes and
 * ignore anything non-finite instead of ever writing NaN/undefined into state.
 */
function extractSliderValue(value: number | readonly number[]): number | null {
  const next = Array.isArray(value) ? value[0] : value;
  return typeof next === "number" && Number.isFinite(next) ? next : null;
}

export function ScenarioSimulator({ businessId, score }: { businessId: string; score: ScoreResult }) {
  const [revenueChangePct, setRevenueChangePct] = useState(0);
  const [expenseChangePct, setExpenseChangePct] = useState(0);
  const [topCustomerLost, setTopCustomerLost] = useState(false);

  const raw = useApiFetch<BusinessRawData>(businessRawUrl(businessId));

  const inputs = { revenueChangePct, expenseChangePct, topCustomerLost };
  const isDefault = revenueChangePct === 0 && expenseChangePct === 0 && !topCustomerLost;

  const simulation = useMemo(() => {
    if (!raw.data) return null;
    const financials = buildFinancialSummary(raw.data, score);
    return simulateScenario(score, financials, { revenueChangePct, expenseChangePct, topCustomerLost });
  }, [raw.data, score, revenueChangePct, expenseChangePct, topCustomerLost]);

  const reset = () => {
    setRevenueChangePct(0);
    setExpenseChangePct(0);
    setTopCustomerLost(false);
  };

  const simulatedScore = simulation?.overallScore ?? score.overall_score;
  const delta = Math.round((simulatedScore - score.overall_score) * 10) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={SlidersHorizontal} />
          Scenario Simulator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A simplified, client-side estimate — the last quarter of activity is adjusted and
          re-scored instantly as you move the controls. Compliance, concentration, and digital
          footprint aren&apos;t affected by these levers.
        </p>
      </CardHeader>
      <CardContent>
        {raw.loading && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {raw.error && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load the underlying data for this simulator ({raw.error}).
          </p>
        )}

        {raw.data && (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="revenue-slider" className="font-medium text-foreground">
                    Revenue change
                  </label>
                  <span className="font-mono text-xs text-chart-1">{formatPct(revenueChangePct)}</span>
                </div>
                <Slider
                  id="revenue-slider"
                  className="mt-3"
                  min={REVENUE_MIN}
                  max={REVENUE_MAX}
                  step={5}
                  value={[revenueChangePct]}
                  onValueChange={(value) => {
                    const next = extractSliderValue(value);
                    if (next !== null) setRevenueChangePct(next);
                  }}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{REVENUE_MIN}%</span>
                  <span>{REVENUE_MAX}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="expense-slider" className="font-medium text-foreground">
                    Expense change
                  </label>
                  <span className="font-mono text-xs text-chart-1">{formatPct(expenseChangePct)}</span>
                </div>
                <Slider
                  id="expense-slider"
                  className="mt-3"
                  min={EXPENSE_MIN}
                  max={EXPENSE_MAX}
                  step={5}
                  value={[expenseChangePct]}
                  onValueChange={(value) => {
                    const next = extractSliderValue(value);
                    if (next !== null) setExpenseChangePct(next);
                  }}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{EXPENSE_MIN}%</span>
                  <span>{EXPENSE_MAX}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Top customer stops paying</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Loses the largest UPI counterparty</p>
                </div>
                <Switch checked={topCustomerLost} onCheckedChange={setTopCustomerLost} />
              </div>

              <button
                type="button"
                onClick={reset}
                disabled={isDefault}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Reset to current
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-lg border border-border px-4 py-2 text-center">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Current</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {Math.round(score.overall_score)}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="rounded-lg border border-chart-1/40 bg-chart-1/5 px-4 py-2 text-center">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Simulated</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-chart-1">
                    {Math.round(simulatedScore)}
                  </p>
                </div>
                {!isDefault && delta !== 0 && (
                  <Badge
                    variant="outline"
                    className={delta > 0 ? "border-status-good/30 text-status-good" : "border-status-critical/30 text-status-critical"}
                  >
                    {delta > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm text-foreground/90">
                {describeScenario(inputs, score.overall_score, simulatedScore)}
              </p>

              <div className="mt-4">
                <SubScoreRadar subScores={score.sub_scores} compareSubScores={simulation?.subScores} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
