# Lead Queue

A dashboard that does the grunt work of SME lead research: searches Google Maps
(via SerpAPI) for businesses in target cities/categories, checks whether they
have a working website, checks if they're running Meta ads, scores each one,
and gives you a WhatsApp-ready link with a one-line pitch angle per lead.

It does **not** send messages — it only researches and qualifies. You DM manually.

---

## 1. Set up Supabase

1. Open your Supabase project → **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` and run it. This creates 4 tables:
   `leads`, `search_batches`, `search_log`, `target_queries`.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → this is `SUPABASE_URL`
   - `service_role` key (NOT the anon key) → this is `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses row-level security — it's only ever used
server-side in API routes, never sent to the browser. Don't expose it in
any `NEXT_PUBLIC_*` variable.

## 2. Get your SerpAPI key

You said you already have one — grab it from
[serpapi.com/manage-api-key](https://serpapi.com/manage-api-key).
This is `SERPAPI_KEY`.

## 3. (Optional) Meta Ad Library access token

This powers the "running ads" signal. If you skip it, that signal just
stays off (`running_ads` always false) and everything else still works.

To get one: create a Meta developer app at developers.facebook.com,
generate a User or App access token with `ads_read` permission scoped to
Ad Library access (this does NOT require app review — Ad Library search is public data).
Set as `META_ACCESS_TOKEN`.

## 4. Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your real keys
npm run dev
```

Visit `http://localhost:3000`.

## 5. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel
```

Or connect the GitHub repo to Vercel directly from the dashboard.

Then in **Vercel → Project → Settings → Environment Variables**, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERPAPI_KEY`
- `META_ACCESS_TOKEN` (optional)
- `CRON_SECRET` (any random string — protects the scheduled batch endpoint)

Redeploy after adding env vars.

### Automatic weekly batches

`vercel.json` schedules `/api/cron/weekly-batch` to run every **Monday at 6am UTC**.
It pulls all `active` rows from `target_queries` (capped at 60 per run to stay
within a 250/month SerpAPI plan) and runs them automatically — so leads are
waiting in the dashboard when you check it, no manual trigger needed.

Vercel Cron requires a **Pro plan** for anything more frequent than once/day,
but a weekly run is supported on Hobby. Adjust the schedule string in
`vercel.json` (cron syntax) if you want a different cadence.

You can still trigger batches manually anytime from the dashboard —
the cron is just a convenience on top.

---

## How it works

```
target_queries (your city/category list)
        |
SerpAPI Google Maps search  ->  1 search = 1 unit of your monthly quota
        |
for each new business (deduped on Google's place_id):
  -> check website (missing / broken / weak / ok)
  -> check Meta Ad Library (running ads or not)
  -> normalize phone -> E.164 -> wa.me link
  -> score 0-100 + plain-language "detected need"
        |
stored in `leads` table -> shown in dashboard, sorted by score
```

## Managing your SerpAPI quota

The dashboard shows a live quota bar (`/api/quota`) based on your plan's
monthly search limit (default assumed: 250/month — edit `MONTHLY_QUOTA` in
`app/api/quota/route.ts` if your plan differs).

Each row you select in "Target queries" and run = 1 search = ~20 raw results
before qualification filtering. Recommended pattern: don't run daily — batch
20-30 queries at once every week or two so you always have backlog without
burning quota on small pulls.

## Extending

- **More countries**: just add rows to `target_queries` via the dashboard —
  no code changes needed.
- **Better website scoring**: `lib/websiteCheck.ts` has the heuristics —
  easy to add signals (SSL cert age, page speed, etc.) later.
- **CRM-style pipeline**: `leads.status` already supports
  new -> contacted -> replied -> won/dead — extend `STATUS_OPTIONS` in
  `components/LeadTable.tsx` if you want more stages.
