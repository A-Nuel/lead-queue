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
  serpapi_pagination?: {
    next_page_token?: string;
  };
  error?: string;
}

/**
 * Runs a Google Maps search via SerpAPI for a given category + location,
 * paginating through multiple pages of results.
 *
 * IMPORTANT: each page fetched is a SEPARATE call against your SerpAPI
 * quota — so maxPages=3 means 3 units consumed for this one query, not 1.
 * Default is 1 page (~20 results) to match "1 search = 1 quota unit"
 * assumption elsewhere in the app. Raise maxPages deliberately when you
 * want to trade quota for volume on a specific high-value query.
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
  let nextPageToken: string | undefined;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      engine: "google_maps",
      q: query,
      type: "search",
      api_key: apiKey,
    });
    if (nextPageToken) params.set("next_page_token", nextPageToken);

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

    allResults.push(...pageResults);

    nextPageToken = data.serpapi_pagination?.next_page_token;
    if (!nextPageToken || pageResults.length === 0) break; // no more pages available
  }

  return { results: allResults, pagesFetched };
}
