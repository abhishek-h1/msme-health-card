"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { businessesUrl, type BusinessSummary } from "@/lib/api";
import { ARCHETYPE_GROUP, type ArchetypeGroup } from "@/lib/score-format";
import { useApiFetch } from "@/lib/use-fetch";

const GROUP_ORDER: ArchetypeGroup[] = ["thin_file", "declining", "other"];

const GROUP_META: Record<ArchetypeGroup, { title: string; description: string }> = {
  thin_file: {
    title: "Thin-file, cash-flow strong",
    description: "Little to no formal GST or EPFO history, but consistent digital cash flow.",
  },
  declining: {
    title: "Formally healthy, quietly declining",
    description: "Solid GST and EPFO history on paper — recent months tell a different story.",
  },
  other: {
    title: "Stable, growing & seasonal",
    description: "A mix of steady, expanding, and cyclical businesses.",
  },
};

export default function Home() {
  const { data: businesses, error, loading } = useApiFetch<BusinessSummary[]>(businessesUrl());

  const groups: Record<ArchetypeGroup, BusinessSummary[]> = { thin_file: [], declining: [], other: [] };
  for (const business of businesses ?? []) {
    const group = ARCHETYPE_GROUP[business.archetype] ?? "other";
    groups[group].push(business);
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:px-10">
      <header className="mb-12">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          MSME Health Card
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-foreground sm:text-4xl">
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
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
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
          {GROUP_ORDER.map((group) =>
            groups[group].length ? (
              <section key={group}>
                <h2 className="text-lg font-semibold text-foreground">{GROUP_META[group].title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{GROUP_META[group].description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {groups[group].map((business) => (
                    <Link
                      key={business.business_id}
                      href={`/dashboard/${business.business_id}`}
                      className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-chart-1/40 hover:bg-accent"
                    >
                      <div className="min-w-0">
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
