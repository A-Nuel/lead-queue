import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServer();
  const { data: targets, error } = await supabase
    .from("target_queries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach a rough count of leads already stored for each target's
  // city+category+country combo, so the UI can warn before re-running
  // a query that's likely to return mostly duplicates.
  const withCounts = await Promise.all(
    (targets || []).map(async (t) => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("country", t.country)
        .eq("city", t.city)
        .eq("category", t.category);
      return { ...t, leads_count: count || 0 };
    })
  );

  return NextResponse.json({ targets: withCounts });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const body = await req.json();
  const { country, city, category } = body;

  if (!country || !city || !category) {
    return NextResponse.json(
      { error: "country, city, and category are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("target_queries")
    .insert({ country, city, category })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ target: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabase.from("target_queries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
