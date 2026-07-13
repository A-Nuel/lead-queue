"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

interface Quota {
  quota: number;
  used: number;
  remaining: number;
  resetsOn: string;
}

export default function QuotaBar() {
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  if (!quota) return null;

  const pct = Math.min((quota.used / quota.quota) * 100, 100);
  const isLow = quota.remaining < quota.quota * 0.15;
  const resetDate = new Date(quota.resetsOn);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 min-w-[240px]">
      <Gauge size={16} className="text-zinc-600 shrink-0" />
      <div className="flex-1 min-w-[140px]">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-zinc-500">SerpAPI searches</span>
          <span className={`font-mono tabular-nums ${isLow ? "text-amber-400" : "text-zinc-300"}`}>
            {quota.used}/{quota.quota}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isLow ? "#fbbf24" : "#34d399",
            }}
          />
        </div>
      </div>
      <span className="text-[11px] text-zinc-600 shrink-0 hidden sm:block whitespace-nowrap">
        resets {resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}
