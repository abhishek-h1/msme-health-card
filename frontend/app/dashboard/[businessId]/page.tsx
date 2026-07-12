"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Info,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataCompletenessPanel } from "@/components/data-completeness-panel";
import { HealthGauge } from "@/components/health-gauge";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { SubScoreRadar } from "@/components/sub-score-radar";

import { businessAnalysisUrl, businessScoreUrl, type AnalysisResult, type ScoreResult } from "@/lib/api";
import { useApiFetch } from "@/lib/use-fetch";

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

      <header className="mt-4 border-b border-border pb-6">
        <p className="font-mono text-xs text-muted-foreground">{data.business_id}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
          {data.name}
        </h1>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall Health Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <HealthGauge score={data.overall_score} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Data Completeness</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <DataCompletenessPanel completeness={data.data_completeness} />
          </CardContent>
        </Card>
      </div>

      <ScenarioSimulator businessId={businessId} score={data} />

      <Tabs defaultValue="scoring" className="mt-6">
        <TabsList>
          <TabsTrigger value="scoring">Score Breakdown</TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="size-3.5" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sub-Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <SubScoreRadar subScores={data.sub_scores} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>6-Month Score Trend</CardTitle>
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
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-chart-1" />
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
              <CardTitle>Strengths, Risks &amp; Anomalies</CardTitle>
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
              <CardTitle>Recommendations</CardTitle>
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
      </Tabs>
    </div>
  );
}
