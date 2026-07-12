"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ScoreResult } from "@/lib/api";
import { SUB_SCORE_ORDER, SUB_SCORE_SHORT_LABEL } from "@/lib/score-format";

interface RadarPoint {
  subject: string;
  fullLabel: string;
  score: number;
  available: boolean;
  compareScore?: number;
}

function RadarTooltip({
  active,
  payload,
  compareLabel,
}: {
  active?: boolean;
  payload?: { payload: RadarPoint }[];
  compareLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-popover-foreground">{point.fullLabel}</div>
      <div className="text-muted-foreground">{point.available ? `${point.score} / 100` : "No data available"}</div>
      {compareLabel && point.compareScore !== undefined && (
        <div className="text-chart-1">
          {compareLabel}: {point.compareScore} / 100
        </div>
      )}
    </div>
  );
}

interface SubScoreRadarProps {
  subScores: ScoreResult["sub_scores"];
  compareSubScores?: ScoreResult["sub_scores"];
  baseLabel?: string;
  compareLabel?: string;
}

export function SubScoreRadar({
  subScores,
  compareSubScores,
  baseLabel = "Current",
  compareLabel = "Simulated",
}: SubScoreRadarProps) {
  const data: RadarPoint[] = SUB_SCORE_ORDER.map((key) => {
    const sub = subScores[key];
    const compareSub = compareSubScores?.[key];
    return {
      subject: SUB_SCORE_SHORT_LABEL[key],
      fullLabel: sub.label,
      score: sub.available && sub.score !== null ? sub.score : 0,
      available: sub.available,
      compareScore: compareSub?.available && compareSub.score !== null ? compareSub.score : undefined,
    };
  });

  return (
    <div>
      {compareSubScores && (
        <div className="mb-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-3" />
            {baseLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-1" />
            {compareLabel}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} />
          {compareSubScores ? (
            <>
              <Radar dataKey="score" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.05} strokeWidth={1.5} />
              <Radar dataKey="compareScore" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} strokeWidth={2} />
            </>
          ) : (
            <Radar dataKey="score" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} strokeWidth={2} />
          )}
          <Tooltip content={<RadarTooltip compareLabel={compareSubScores ? compareLabel : undefined} />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
