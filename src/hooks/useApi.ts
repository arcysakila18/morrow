"use client";
import { useQuery } from "@tanstack/react-query";

export function useApi<T>(url: string | null, opts: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ["api", url],
    enabled: !!url,
    refetchInterval: opts.refetchInterval,
    queryFn: async () => {
      const r = await fetch(url!);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
      return j as T;
    },
  });
}
