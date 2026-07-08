"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; data: unknown }
  | { status: "error"; message: string };

async function fetchHealth(): Promise<HealthState> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/health`);
    if (!res.ok) {
      return { status: "error", message: `Backend responded with ${res.status}` };
    }
    const data = await res.json();
    return { status: "ok", data };
  } catch {
    return {
      status: "error",
      message: "Could not reach the backend. Is uvicorn running on port 8000?",
    };
  }
}

export default function Home() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  const check = () => {
    setHealth({ status: "loading" });
    fetchHealth().then(setHealth);
  };

  useEffect(() => {
    check();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">MSME Health Card</h1>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-card-foreground">
        <span className="text-sm text-muted-foreground">Backend status</span>

        {health.status === "loading" && <span>Checking...</span>}

        {health.status === "ok" && (
          <span className="flex items-center gap-2 font-mono text-lg">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            {JSON.stringify(health.data)}
          </span>
        )}

        {health.status === "error" && (
          <span className="flex items-center gap-2 text-destructive">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            {health.message}
          </span>
        )}

        <Button onClick={check} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    </div>
  );
}
