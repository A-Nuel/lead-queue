export interface SerpMapsResult {
  place_id: string;
  title: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  type?: string; // category as returned by Google
}

interface SerpApiResponse {
  local_results?: Array<{
    place_id: string;
    title: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    reviews?: number;
    type?: string;
  }>;
  error?: string;
}

/**
 * Runs a Google Maps search via SerpAPI for a given category + location,
 * paginating through multiple pages of results.
 *
 * IMPORTANT: unlike some other SerpApi engines, the `google_maps` engine
 * does NOT use next_page_token — it uses a plain offset parameter called
 * `start` (0 = page 1, 20 = page 2, 40 = page 3, etc., ~20 results/page).
 * SerpApi recommends not going past start=100 (page 6), since results
 * become duplicated/irrelevant beyond that.
 *
 * Each page fetched is a SEPARATE call against your SerpAPI quota — so
 * maxPages=3 means 3 units consumed for this one query, not 1.
 */
export async function searchGoogleMaps(
  category: string,
  city: string,
  country: string,
  maxPages: number = 1
): Promise<{ results: SerpMapsResult[]; pagesFetched: number }> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("Missing SERPAPI_KEY environment variable.");
  }

  const query = `${category} in ${city}, ${country}`;
  const allResults: SerpMapsResult[] = [];
  let pagesFetched = 0;
  const RESULTS_PER_PAGE = 20;

  for (let page = 0; page < maxPages; page++) {
    const start = page * RESULTS_PER_PAGE;
    const params = new URLSearchParams({
      engine: "google_maps",
      q: query,
      type: "search",
      api_key: apiKey,
    });
    if (start > 0) params.set("start", String(start));

    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error(`SerpAPI request failed: ${res.status} ${res.statusText}`);
    }

    const data: SerpApiResponse = await res.json();

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    pagesFetched++;

    const pageResults = (data.local_results || []).map((r) => ({
      place_id: r.place_id,
      title: r.title,
      address: r.address,
      phone: r.phone,
      website: r.website,
      rating: r.rating,
      reviews: r.reviews,
      type: r.type,
    }));

    if (pageResults.length === 0) break; // no more results available past this offset

    allResults.push(...pageResults);
  }

  return { results: allResults, pagesFetched };
}
