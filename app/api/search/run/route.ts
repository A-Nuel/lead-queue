import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { searchGoogleMaps } from "@/lib/serpapi";
import { checkWebsite } from "@/lib/websiteCheck";
import { checkMetaAds, COUNTRY_CODES } from "@/lib/metaAdLibrary";
import { normalizeToE164 } from "@/lib/phone";
import { scoreAndDetectNeed } from "@/lib/scoring";
import { lookupLineTypeTwilio } from "@/lib/twilioLookup";

export const maxDuration = 300; // allow up to 5 min for a batch (Vercel Pro; Hobby caps at 60s)

interface TargetQuery {
  id: string;
  country: string;
  city: string;
  category: string;
}

/**
 * POST /api/search/run
 * Body: { queries: [{country, city, category}, ...], label?: string, pagesPerQuery?: number }
 *
 * Runs SerpAPI search(es) per query, enriches each new lead (website check,
 * ad check, phone normalization, scoring), dedupes on place_id, and stores.
 *
 * pagesPerQuery (default 1): how many pages of ~20 results to pull per
 * query. Each page is a SEPARATE SerpAPI call — pagesPerQuery=3 on 10
 * queries consumes 30 units of quota, not 10. Raise this when a query is
 * worth digging deeper into; keep at 1 for broad sweeps across many cities.
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const body = await req.json();
  const queries: TargetQuery[] = body.queries || [];
  const label: string = body.label || `Batch ${new Date().toISOString()}`;
  const pagesPerQuery: number = Math.min(Math.max(body.pagesPerQuery || 1, 1), 5); // cap at 5 pages/query as a safety rail

  if (queries.length === 0) {
    return NextResponse.json({ error: "No queries provided." }, { status: 400 });
  }

  // Create the batch record
  const { data: batch, error: batchError } = await supabase
    .from("search_batches")
    .insert({
      label,
      queries_planned: queries.length,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      { error: `Failed to create batch: ${batchError?.message}` },
      { status: 500 }
    );
  }

  let totalNew = 0;
  let totalRaw = 0;
  let totalQuotaUnits = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const { results, pagesFetched } = await searchGoogleMaps(
        q.category,
        q.city,
        q.country,
        pagesPerQuery
      );
      totalRaw += results.length;
      totalQuotaUnits += pagesFetched;

      let newCount = 0;

      for (const r of results) {
        // Skip if we already have this place_id
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("place_id", r.place_id)
          .maybeSingle();

        if (existing) continue;

        const websiteCheck = await checkWebsite(r.website);
        const websiteStatus = websiteCheck.status;
        const countryCode = COUNTRY_CODES[q.country] || "US";
        const runningAds = await checkMetaAds(r.title, countryCode);
        const { e164, whatsappLink, lineType: freeLineType } = normalizeToE164(r.phone, q.country);

        // Free prefix-based classification covers UK/AU/UAE. For US/Canada
        // (and any other case that comes back "unknown"), fall back to a
        // paid Twilio Lookup — only spend the ~half-cent call when we
        // actually need it, not on every lead.
        let lineType = freeLineType;
        if (freeLineType === "unknown" && e164 && !e164.startsWith("?")) {
          lineType = await lookupLineTypeTwilio(e164);
        }

        const { score, detectedNeed: ruleBasedNeed } = scoreAndDetectNeed({
          websiteStatus,
          runningAds,
          rating: r.rating,
          reviewsCount: r.reviews,
          lineType,
        });

        // If the AI reviewed the site, surface its actual reasoning instead
        // of the generic rule-based phrase — it's more specific and accurate.
        const detectedNeed = websiteCheck.aiReasoning
          ? `${ruleBasedNeed} — ${websiteCheck.aiReasoning}`
          : ruleBasedNeed;

        await supabase.from("leads").insert({
          place_id: r.place_id,
          name: r.title,
          category: q.category,
          country: q.country,
          city: q.city,
          address: r.address,
          phone_raw: r.phone,
          phone_e164: e164,
          line_type: lineType,
          whatsapp_link: lineType === "landline" ? null : whatsappLink,
          website: r.website,
          website_status: websiteStatus,
          rating: r.rating,
          reviews_count: r.reviews,
          running_ads: runningAds,
          ads_checked: true,
          detected_need: detectedNeed,
          score,
          search_batch_id: batch.id,
        });

        newCount++;
      }

      totalNew += newCount;

      // Log actual quota units used (1 row per page, not per query) so
      // /api/quota reflects real SerpAPI consumption.
      for (let i = 0; i < pagesFetched; i++) {
        await supabase.from("search_log").insert({
          batch_id: batch.id,
          query_country: q.country,
          query_city: q.city,
          query_category: q.category,
          results_returned: results.length,
          results_new: newCount,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${q.category} in ${q.city}, ${q.country}: ${msg}`);
    }
  }

  await supabase
    .from("search_batches")
    .update({
      status: errors.length === queries.length ? "failed" : "done",
      queries_used: totalQuotaUnits,
      finished_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  return NextResponse.json({
    batchId: batch.id,
    queriesRun: queries.length,
    quotaUnitsUsed: totalQuotaUnits,
    rawResults: totalRaw,
    newLeads: totalNew,
    errors,
  });
}
