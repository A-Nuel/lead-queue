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
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5">
      <Gauge size={16} className="text-[var(--text-dim)] shrink-0" />
      <div className="flex-1 min-w-[140px]">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--text-dim)]">SerpAPI searches this month</span>
          <span className={isLow ? "text-[var(--warn)]" : "text-[var(--text)]"}>
            {quota.used} / {quota.quota}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: isLow ? "var(--warn)" : "var(--accent)",
            }}
          />
        </div>
      </div>
      <span className="text-xs text-[var(--text-dim)] shrink-0 hidden sm:block">
        resets {resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}
