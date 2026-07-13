// Lightweight phone normalization — no external dependency needed for this scale.
// Google Maps / SerpAPI usually returns local-format numbers (e.g. "020 7946 0958"
// or "(555) 123-4567"), so we use the country as a hint to build E.164.

const COUNTRY_DIAL_CODES: Record<string, string> = {
  "United Kingdom": "44",
  UK: "44",
  "United Arab Emirates": "971",
  UAE: "971",
  "United States": "1",
  US: "1",
  USA: "1",
  Canada: "1",
  Australia: "61",
};

export interface PhoneResult {
  e164: string | null;
  whatsappLink: string | null;
  lineType: "mobile" | "landline" | "unknown";
}

/**
 * Best-effort mobile vs landline classification using national numbering
 * plan prefixes. This is heuristic, not authoritative (a real carrier
 * lookup API like Twilio Lookup would be definitive), but it's free and
 * catches the large majority of obvious landlines so they can be filtered
 * out of a WhatsApp-focused lead list.
 */
function classifyLineType(nationalDigits: string, country: string): "mobile" | "landline" | "unknown" {
  const c = country.toUpperCase();

  // UK: mobiles start with 7 (after leading 0 stripped), e.g. 07911 -> 7911...
  // Landlines start with 1, 2, 3 (e.g. 020 London, 0161 Manchester, 0117 Bristol)
  if (c.includes("UK") || c.includes("UNITED KINGDOM")) {
    if (nationalDigits.startsWith("7")) return "mobile";
    if (/^[123]/.test(nationalDigits)) return "landline";
    return "unknown";
  }

  // Australia: mobiles start with 4 (04xx -> 4xx...). Landlines start with 2,3,7,8 (area codes).
  if (c.includes("AUSTRALIA") || c === "AU") {
    if (nationalDigits.startsWith("4")) return "mobile";
    if (/^[2378]/.test(nationalDigits)) return "landline";
    return "unknown";
  }

  // UAE: mobiles start with 5 (05x -> 5x...). Landlines start with 2,3,4,6,7,9 (emirate codes).
  if (c.includes("UAE") || c.includes("EMIRATES")) {
    if (nationalDigits.startsWith("5")) return "mobile";
    if (/^[234679]/.test(nationalDigits)) return "landline";
    return "unknown";
  }

  // US/Canada: no structural mobile/landline distinction in the numbering plan
  // itself (NANP numbers are portable between line types) — can't classify
  // reliably without a carrier lookup, so leave as unknown rather than guess wrong.
  if (c.includes("US") || c.includes("UNITED STATES") || c.includes("CANADA")) {
    return "unknown";
  }

  return "unknown";
}

export function normalizeToE164(
  rawPhone: string | null | undefined,
  country: string
): PhoneResult {
  if (!rawPhone) return { e164: null, whatsappLink: null, lineType: "unknown" };

  // Strip everything except digits and leading +
  let digits = rawPhone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    // Already has a country code — strip it back off to get national digits for classification
    const clean = digits.replace(/\D/g, "");
    const dialCode = COUNTRY_DIAL_CODES[country];
    const national = dialCode && clean.startsWith(dialCode) ? clean.slice(dialCode.length) : clean;
    return {
      e164: `+${clean}`,
      whatsappLink: `https://wa.me/${clean}`,
      lineType: classifyLineType(national, country),
    };
  }

  const dialCode = COUNTRY_DIAL_CODES[country];
  if (!dialCode) {
    // Unknown country mapping — return digits as-is, flagged for manual check
    return { e164: digits ? `?${digits}` : null, whatsappLink: null, lineType: "unknown" };
  }

  // Remove leading 0 (common in UK/AU/national formats) before prefixing dial code
  digits = digits.replace(/^0+/, "");

  const e164 = `+${dialCode}${digits}`;
  const waDigits = `${dialCode}${digits}`;
  return {
    e164,
    whatsappLink: `https://wa.me/${waDigits}`,
    lineType: classifyLineType(digits, country),
  };
}
