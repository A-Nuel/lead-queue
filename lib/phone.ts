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

export function normalizeToE164(
  rawPhone: string | null | undefined,
  country: string
): { e164: string | null; whatsappLink: string | null } {
  if (!rawPhone) return { e164: null, whatsappLink: null };

  // Strip everything except digits and leading +
  let digits = rawPhone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    // Already has a country code
    const clean = digits.replace(/\D/g, "");
    return { e164: `+${clean}`, whatsappLink: `https://wa.me/${clean}` };
  }

  const dialCode = COUNTRY_DIAL_CODES[country];
  if (!dialCode) {
    // Unknown country mapping — return digits as-is, flagged for manual check
    return { e164: digits ? `?${digits}` : null, whatsappLink: null };
  }

  // Remove leading 0 (common in UK/AU/national formats) before prefixing dial code
  digits = digits.replace(/^0+/, "");

  const e164 = `+${dialCode}${digits}`;
  const waDigits = `${dialCode}${digits}`;
  return { e164, whatsappLink: `https://wa.me/${waDigits}` };
}
