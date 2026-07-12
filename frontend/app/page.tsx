"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { businessesUrl, type BusinessSummary } from "@/lib/api";
import { ARCHETYPE_GROUP, type ArchetypeGroup } from "@/lib/score-format";
import { useApiFetch } from "@/lib/use-fetch";

const GROUP_ORDER: ArchetypeGroup[] = ["thin_file", "declining", "other"];

const GROUP_META: Record<ArchetypeGroup, { title: string; description: string; dotClass: string }> = {
  thin_file: {
    title: "Thin-file, cash-flow strong",
    description: "Little to no formal GST or EPFO history, but consistent digital cash flow.",
    dotClass: "bg-chart-1",
  },
  declining: {
    title: "Formally healthy, quietly declining",
    description: "Solid GST and EPFO history on paper — recent months tell a different story.",
    dotClass: "bg-status-warning",
  },
  other: {
    title: "Stable, growing & seasonal",
    description: "A mix of steady, expanding, and cyclical businesses.",
    dotClass: "bg-chart-3",
  },
};

const ENTRANCE_DELAY = ["delay-0", "delay-100", "delay-200"];

function initialsOf(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

// Tone-on-tone monogram tints drawn from the existing chart palette --
// identity variety without introducing new hues (status colors excluded).
const MONOGRAM_TINTS = [
  "bg-chart-1/10 text-chart-1",
  "bg-chart-2/10 text-chart-2",
  "bg-chart-3/15 text-chart-3",
];

function monogramTint(businessId: string) {
  let hash = 0;
  for (const char of businessId) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return MONOGRAM_TINTS[hash % MONOGRAM_TINTS.length];
}

export default function Home() {
  const { data: businesses, error, loading } = useApiFetch<BusinessSummary[]>(businessesUrl());

  const groups: Record<ArchetypeGroup, BusinessSummary[]> = { thin_file: [], declining: [], other: [] };
  for (const business of businesses ?? []) {
    const group = ARCHETYPE_GROUP[business.archetype] ?? "other";
    groups[group].push(business);
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:px-10">
      <header className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both motion-reduce:animate-none">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2.5 13h4l2.5-6.5 4.5 11 2.5-6.5h5.5" />
            </svg>
          </span>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            MSME Health Card
          </p>
        </div>
        <h1 className="mt-5 font-heading text-3xl font-semibold text-foreground sm:text-4xl">
          Choose a business to review
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Credit health scored from GST, UPI, Account Aggregator, and EPFO data — plus an
          AI-generated risk read for the loan desk. Businesses are grouped by the story their
          data tells.
        </p>
      </header>

      {loading && (
        <div className="space-y-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Skeleton className="h-[76px] w-full" />
                <Skeleton className="h-[76px] w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Couldn&apos;t load businesses from the backend ({error}). Is uvicorn running on port
          8000?
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-12">
          {GROUP_ORDER.map((group, groupIndex) =>
            groups[group].length ? (
              <section
                key={group}
                className={`animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both motion-reduce:animate-none ${ENTRANCE_DELAY[groupIndex] ?? ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${GROUP_META[group].dotClass}`} aria-hidden />
                  <h2 className="text-lg font-semibold text-foreground">{GROUP_META[group].title}</h2>
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {groups[group].length}
                  </Badge>
                </div>
                <p className="mt-1.5 pl-[18px] text-sm text-muted-foreground">{GROUP_META[group].description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {groups[group].map((business) => (
                    <Link
                      key={business.business_id}
                      href={`/dashboard/${business.business_id}`}
                      className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-chart-1/50 hover:shadow-md hover:shadow-chart-1/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold ${monogramTint(business.business_id)}`}
                      >
                        {initialsOf(business.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{business.name}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{business.sector}</span>
                          <span aria-hidden>·</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {business.registration_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-chart-1" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
