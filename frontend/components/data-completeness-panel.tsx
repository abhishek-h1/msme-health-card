import { CheckCircle2, MinusCircle } from "lucide-react";

import type { DataCompleteness } from "@/lib/api";

const SOURCES: { key: keyof DataCompleteness; label: string; description: string }[] = [
  { key: "gst", label: "GST", description: "Filings & turnover" },
  { key: "upi", label: "UPI", description: "Daily transactions" },
  { key: "bank", label: "Account Aggregator", description: "Bank balance & bounces" },
  { key: "epfo", label: "EPFO", description: "Payroll contributions" },
];

export function DataCompletenessPanel({ completeness }: { completeness: DataCompleteness }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {SOURCES.map((source) => {
        const available = completeness[source.key];
        return (
          <div
            key={source.key}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center ${
              available ? "border-status-good/30 bg-status-good/5" : "border-border bg-muted/40"
            }`}
          >
            {available ? (
              <CheckCircle2 className="size-5 text-status-good" />
            ) : (
              <MinusCircle className="size-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">{source.label}</span>
            <span className="text-xs text-muted-foreground">{available ? source.description : "Not available"}</span>
          </div>
        );
      })}
    </div>
  );
}
