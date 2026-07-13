import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

const MONTHLY_QUOTA = 250;

export async function GET() {
  const supabase = getSupabaseServer();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("search_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const used = count || 0;

  return NextResponse.json({
    quota: MONTHLY_QUOTA,
    used,
    remaining: MONTHLY_QUOTA - used,
    resetsOn: new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      1
    ).toISOString(),
  });
}
