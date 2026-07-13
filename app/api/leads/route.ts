import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(req.url);

  const country = searchParams.get("country");
  const status = searchParams.get("status");
  const minScore = searchParams.get("minScore");
  const category = searchParams.get("category");
  const lineType = searchParams.get("lineType");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  let query = supabase
    .from("leads")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (country) query = query.eq("country", country);
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (minScore) query = query.gte("score", parseInt(minScore, 10));
  if (lineType === "mobile") query = query.neq("line_type", "landline");
  if (lineType === "landline") query = query.eq("line_type", "landline");

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseServer();
  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing lead id." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
