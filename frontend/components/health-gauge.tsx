"use client";

import { getScoreBand, scoreBandClasses, scoreBandLabel } from "@/lib/score-format";

const CX = 100;
const CY = 100;
const RADIUS = 80;
const TRACK_WIDTH = 16;
const START_ANGLE = 180;
const END_ANGLE = 0;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/** Arc that sweeps clockwise from a larger angle to a smaller one, tracing the
 * upper semicircle when angles run 180 -> 0 (left -> top -> right). */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

const scoreToAngle = (score: number) => START_ANGLE - (Math.max(0, Math.min(100, score)) / 100) * START_ANGLE;

const BAND_COLOR_VAR: Record<string, string> = {
  critical: "var(--status-critical)",
  warning: "var(--status-warning)",
  good: "var(--status-good)",
};

export function HealthGauge({ score }: { score: number }) {
  const band = getScoreBand(score);
  const redEnd = scoreToAngle(40);
  const amberEnd = scoreToAngle(70);
  const progressEnd = scoreToAngle(score);

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 200 112" className="w-full overflow-visible">
        <path
          d={describeArc(CX, CY, RADIUS, START_ANGLE, redEnd)}
          stroke="var(--status-critical)"
          strokeOpacity={0.16}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={describeArc(CX, CY, RADIUS, redEnd, amberEnd)}
          stroke="var(--status-warning)"
          strokeOpacity={0.16}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={describeArc(CX, CY, RADIUS, amberEnd, END_ANGLE)}
          stroke="var(--status-good)"
          strokeOpacity={0.16}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={describeArc(CX, CY, RADIUS, START_ANGLE, progressEnd)}
          stroke={BAND_COLOR_VAR[band]}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <text x={CX - RADIUS} y={CY + 14} fontSize={9} fill="var(--muted-foreground)" textAnchor="start">
          0
        </text>
        <text x={CX + RADIUS} y={CY + 14} fontSize={9} fill="var(--muted-foreground)" textAnchor="end">
          100
        </text>
      </svg>
      <div className="absolute inset-x-0 top-[42%] flex flex-col items-center">
        <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">
          {Math.round(score)}
        </span>
        <span className="text-xs text-muted-foreground">out of 100</span>
        <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreBandClasses[band].softBg} ${scoreBandClasses[band].text}`}>
          {scoreBandLabel[band]}
        </span>
      </div>
    </div>
  );
}
