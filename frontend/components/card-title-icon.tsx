import type { LucideIcon } from "lucide-react";

/** Small teal-tinted icon tile used at the start of every card title -- one
 * consistent accent, repeated, rather than a different color per section. */
export function CardTitleIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-chart-1/10 text-chart-1">
      <Icon className="size-4" />
    </span>
  );
}
