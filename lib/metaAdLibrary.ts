/**
 * Meta Ad Library search — checks if a business name has active/recent ads.
 * Uses the public Ad Library API. Requires a Meta app access token
 * (Ad Library access does NOT require app review, just a token from
 * a registered Meta developer app).
 *
 * Docs: https://www.facebook.com/ads/library/api
 */
export async function checkMetaAds(businessName: string, countryCode: string): Promise<boolean> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    // Not configured — skip silently rather than fail the whole enrichment step
    return false;
  }

  try {
    const params = new URLSearchParams({
      search_terms: businessName,
      ad_reached_countries: JSON.stringify([countryCode]),
      ad_active_status: "ALL",
      access_token: token,
      limit: "1",
    });

    const res = await fetch(
      `https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`
    );

    if (!res.ok) return false;

    const data = await res.json();
    return Array.isArray(data?.data) && data.data.length > 0;
  } catch {
    return false;
  }
}

// Maps our country names to the 2-letter codes Meta's Ad Library expects
export const COUNTRY_CODES: Record<string, string> = {
  "United Kingdom": "GB",
  UK: "GB",
  "United Arab Emirates": "AE",
  UAE: "AE",
  "United States": "US",
  US: "US",
  USA: "US",
  Canada: "CA",
  Australia: "AU",
};
