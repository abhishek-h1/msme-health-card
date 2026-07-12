import { FileText, Landmark, Smartphone, Users, type LucideIcon } from "lucide-react";

import type { DataCompleteness } from "@/lib/api";

const SOURCES: { key: keyof DataCompleteness; label: string; description: string; icon: LucideIcon }[] = [
  { key: "gst", label: "GST", description: "Filings & turnover", icon: FileText },
  { key: "upi", label: "UPI", description: "Daily transactions", icon: Smartphone },
  { key: "bank", label: "Account Aggregator", description: "Bank balance & bounces", icon: Landmark },
  { key: "epfo", label: "EPFO", description: "Payroll contributions", icon: Users },
];

export function DataCompletenessPanel({ completeness }: { completeness: DataCompleteness }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
      {SOURCES.map((source) => {
        const available = completeness[source.key];
        const Icon = source.icon;
        return (
          <div
            key={source.key}
            className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center ${
              available ? "border-status-good/30 bg-status-good/5" : "border-border bg-muted/40"
            }`}
          >
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${
                available ? "bg-status-good/10 text-status-good" : "bg-muted text-muted-foreground/60"
              }`}
            >
              <Icon className="size-4.5" />
            </span>
            <span className="text-sm font-medium text-foreground">{source.label}</span>
            <span className="-mt-1 text-xs text-muted-foreground">
              {available ? source.description : "Not available"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
