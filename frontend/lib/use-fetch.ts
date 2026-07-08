"use client";

import { useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Minimal client-side fetch hook: refetches whenever `url` changes, ignores
 * stale responses from a superseded URL, and surfaces the backend's `detail`
 * message on non-2xx responses. */
export function useApiFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: !!url });

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
        }
        return (await res.json()) as T;
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Something went wrong";
          setState({ data: null, error: message, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
