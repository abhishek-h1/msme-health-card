"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Database,
  Gauge,
  Info,
  Lightbulb,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CardTitleIcon } from "@/components/card-title-icon";
import { DataCompletenessPanel } from "@/components/data-completeness-panel";
import { HealthGauge } from "@/components/health-gauge";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { SubScoreRadar } from "@/components/sub-score-radar";

import { businessAnalysisUrl, businessScoreUrl, type AnalysisResult, type ScoreResult } from "@/lib/api";
import { getScoreBand, scoreBandLabel, type ScoreBand } from "@/lib/score-format";
import { useApiFetch } from "@/lib/use-fetch";

// The header card is fixed navy in both themes, so its status dots use fixed
// bright steps (the theme's status tokens are tuned for light surfaces and
// would go muddy on navy).
const BAND_DOT_ON_NAVY: Record<ScoreBand, string> = {
  good: "bg-[#34C77B]",
  warning: "bg-[#E8B23A]",
  critical: "bg-[#F87171]",
};

function AiUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium text-foreground/80">AI insights aren&apos;t available right now.</p>
        <p className="mt-1 text-muted-foreground">
          {reason ?? "Add an Anthropic API key in backend/.env to enable this."}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10 sm:px-10">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 border-b border-border pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-72 max-w-full" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64 lg:col-span-3" />
      </div>
      <Skeleton className="mt-6 h-96" />
    </div>
  );
}

export default function DashboardPage({ params }: { params: { businessId: string } }) {
  const { businessId } = params;
  const [refreshNonce, setRefreshNonce] = useState(0);

  const score = useApiFetch<ScoreResult>(businessScoreUrl(businessId));
  const analysisUrl =
    refreshNonce === 0
      ? businessAnalysisUrl(businessId)
      : `${businessAnalysisUrl(businessId, true)}&_r=${refreshNonce}`;
  const analysis = useApiFetch<AnalysisResult>(analysisUrl);

  if (score.loading) {
    return <DashboardSkeleton />;
  }

  if (score.error || !score.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load this business</p>
        <p className="mt-2 text-sm text-muted-foreground">{score.error ?? "Unknown error"}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-chart-1 hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to all businesses
        </Link>
      </div>
    );
  }

  const data = score.data;
  const insights = analysis.data;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10 sm:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All businesses
      </Link>

      {/* The "health card" itself: a navy card band naming the business, with a
          faint concentric-arc watermark echoing the gauge. Fixed navy in both
          modes -- like a physical card, it doesn't re-skin with the theme. */}
      <header className="relative mt-4 animate-in overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1B33] to-[#132C52] px-6 py-6 text-white ring-1 ring-white/10 duration-500 fade-in slide-in-from-bottom-2 fill-mode-both motion-reduce:animate-none sm:px-8">
        {/* Champagne-gold foil details + a soft teal aurora -- decorative only,
            kept at low opacity so the card still reads navy-first. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(212,179,106,0.55) 30%, rgba(212,179,106,0.55) 70%, transparent)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #26A0BC 0%, transparent 70%)" }}
          aria-hidden
        />
        <svg
          className="pointer-events-none absolute -top-24 -right-14 h-64 w-64 text-[#D4B36A] opacity-[0.14]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <circle cx="100" cy="100" r="96" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="70" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="44" strokeWidth="1.5" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-widest text-white/50 uppercase">{data.business_id}</p>
            <h1 className="mt-1.5 font-heading text-2xl font-semibold sm:text-3xl">{data.name}</h1>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
            <span className={`size-2 rounded-full ${BAND_DOT_ON_NAVY[getScoreBand(data.overall_score)]}`} aria-hidden />
            {scoreBandLabel[getScoreBand(data.overall_score)]} · {Math.round(data.overall_score)}
          </span>
        </div>
      </header>

      <div className="mt-6 grid animate-in gap-4 duration-500 fade-in slide-in-from-bottom-2 fill-mode-both delay-100 motion-reduce:animate-none lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <CardTitleIcon icon={Gauge} />
              Overall Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <HealthGauge score={data.overall_score} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <CardTitleIcon icon={Database} />
              Data Completeness
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <DataCompletenessPanel completeness={data.data_completeness} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scoring" className="mt-6 animate-in duration-500 fade-in slide-in-from-bottom-2 fill-mode-both delay-200 motion-reduce:animate-none">
        <TabsList>
          <TabsTrigger value="scoring">Score Breakdown</TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="size-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="simulator">
            <SlidersHorizontal className="size-4" />
            Simulator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <CardTitleIcon icon={Activity} />
                  Sub-Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SubScoreRadar subScores={data.sub_scores} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <CardTitleIcon icon={TrendingUp} />
                  6-Month Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreTrendChart trend={data.monthly_trend} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2.5">
                <CardTitleIcon icon={Sparkles} />
                Narrative
                {insights?.cached && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    cached
                  </Badge>
                )}
              </CardTitle>
              <button
                type="button"
                onClick={() => setRefreshNonce((n) => n + 1)}
                disabled={analysis.loading}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${analysis.loading ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            </CardHeader>
            <CardContent>
              {analysis.loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : insights?.narrative ? (
                <p className="text-sm leading-relaxed text-foreground/90">{insights.narrative}</p>
              ) : (
                <AiUnavailable reason={insights?.errors.narrative_agent ?? analysis.error ?? undefined} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <CardTitleIcon icon={ListChecks} />
                Strengths, Risks &amp; Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : insights?.strengths && insights.risks && insights.anomalies ? (
                <Accordion defaultValue={["strengths", "risks"]}>
                  <AccordionItem value="strengths">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-status-good" />
                        Strengths
                        <Badge variant="secondary">{insights.strengths.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                        {insights.strengths.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="risks">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-status-warning" />
                        Risks
                        <Badge variant="secondary">{insights.risks.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                        {insights.risks.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="anomalies">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-status-critical" />
                        Anomalies
                        <Badge variant="secondary">{insights.anomalies.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {insights.anomalies.length ? (
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                          {insights.anomalies.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No anomalies detected.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                <AiUnavailable reason={insights?.errors.risk_agent ?? analysis.error ?? undefined} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <CardTitleIcon icon={Lightbulb} />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : insights?.recommendations ? (
                <ol className="space-y-4">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chart-1/10 text-xs font-semibold text-chart-1">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{rec.recommendation}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{rec.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <AiUnavailable reason={insights?.errors.recommendation_agent ?? analysis.error ?? undefined} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="mt-4">
          <ScenarioSimulator businessId={businessId} score={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
