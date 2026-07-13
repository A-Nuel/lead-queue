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
 * Runs one Google Maps search via SerpAPI for a given category + location.
 * Returns up to 20 results (SerpAPI's default page size for maps).
 * This counts as ONE search against your monthly quota.
 */
export async function searchGoogleMaps(
  category: string,
  city: string,
  country: string
): Promise<SerpMapsResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("Missing SERPAPI_KEY environment variable.");
  }

  const query = `${category} in ${city}, ${country}`;
  const params = new URLSearchParams({
    engine: "google_maps",
    q: query,
    type: "search",
    api_key: apiKey,
  });

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

  return (data.local_results || []).map((r) => ({
    place_id: r.place_id,
    title: r.title,
    address: r.address,
    phone: r.phone,
    website: r.website,
    rating: r.rating,
    reviews: r.reviews,
    type: r.type,
  }));
}
