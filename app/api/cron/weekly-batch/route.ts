import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export const maxDuration = 300;

/**
 * GET /api/cron/weekly-batch
 * Triggered by Vercel Cron (see vercel.json). Pulls all active target_queries
 * and runs them as one batch via /api/search/run, then marks last_run_at.
 *
 * Guarded by CRON_SECRET so it can't be triggered by random requests.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const { data: targets, error } = await supabase
    .from("target_queries")
    .select("*")
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ message: "No active target queries configured." });
  }

  // Cap per run to stay well within monthly quota even if this fires weekly.
  // 250/month ÷ ~4 weeks ≈ 60/week is safe; adjust MAX_PER_RUN if your plan differs.
  const MAX_PER_RUN = 60;
  const batch = targets.slice(0, MAX_PER_RUN);

  const baseUrl = req.nextUrl.origin;
  const res = await fetch(`${baseUrl}/api/search/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: `Scheduled run ${new Date().toISOString().slice(0, 10)}`,
      queries: batch.map((t) => ({
        country: t.country,
        city: t.city,
        category: t.category,
      })),
    }),
  });

  const result = await res.json();

  // Mark last_run_at for the queries we just ran
  const ids = batch.map((t) => t.id);
  await supabase
    .from("target_queries")
    .update({ last_run_at: new Date().toISOString() })
    .in("id", ids);

  return NextResponse.json(result);
}
