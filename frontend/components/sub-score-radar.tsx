"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ScoreResult } from "@/lib/api";
import { SUB_SCORE_ORDER, SUB_SCORE_SHORT_LABEL } from "@/lib/score-format";

interface RadarPoint {
  subject: string;
  fullLabel: string;
  score: number;
  available: boolean;
}

function RadarTooltip({ active, payload }: { active?: boolean; payload?: { payload: RadarPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-popover-foreground">{point.fullLabel}</div>
      <div className="text-muted-foreground">{point.available ? `${point.score} / 100` : "No data available"}</div>
    </div>
  );
}

export function SubScoreRadar({ subScores }: { subScores: ScoreResult["sub_scores"] }) {
  const data: RadarPoint[] = SUB_SCORE_ORDER.map((key) => {
    const sub = subScores[key];
    return {
      subject: SUB_SCORE_SHORT_LABEL[key],
      fullLabel: sub.label,
      score: sub.available && sub.score !== null ? sub.score : 0,
      available: sub.available,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} />
        <Radar dataKey="score" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
