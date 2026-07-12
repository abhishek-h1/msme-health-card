"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TrendPoint } from "@/lib/api";
import { formatMonth } from "@/lib/score-format";

export function ScoreTrendChart({ trend }: { trend: TrendPoint[] }) {
  const data = trend.map((point) => ({ ...point, monthLabel: formatMonth(point.month) }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="monthLabel"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
        <ReferenceLine y={40} stroke="var(--status-critical)" strokeOpacity={0.4} strokeDasharray="4 4" />
        <ReferenceLine y={70} stroke="var(--status-good)" strokeOpacity={0.4} strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          labelStyle={{ color: "var(--popover-foreground)" }}
          formatter={(value) => [`${value}`, "Overall score"]}
        />
        <Area
          type="monotone"
          dataKey="overall_score"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#scoreTrendFill)"
          dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
