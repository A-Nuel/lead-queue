"use client";

import { useState } from "react";
import QuotaBar from "@/components/QuotaBar";
import TargetManager from "@/components/TargetManager";
import LeadTable from "@/components/LeadTable";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-5">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">Lead Queue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              SME leads sourced, qualified, and ready to DM on WhatsApp.
            </p>
          </div>
          <QuotaBar />
        </header>

        <TargetManager onBatchComplete={() => setRefreshKey((k) => k + 1)} />

        <LeadTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
