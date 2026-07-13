"use client";

import { useState } from "react";
import QuotaBar from "@/components/QuotaBar";
import TargetManager from "@/components/TargetManager";
import LeadTable from "@/components/LeadTable";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Lead Queue</h1>
          <p className="text-sm text-[var(--text-dim)]">
            SME leads sourced, qualified, and ready to DM.
          </p>
        </div>
        <QuotaBar />
      </header>

      <TargetManager onBatchComplete={() => setRefreshKey((k) => k + 1)} />

      <LeadTable refreshKey={refreshKey} />
    </div>
  );
}
